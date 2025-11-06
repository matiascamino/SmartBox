#include <WiFi.h>
#include <HTTPClient.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>
#include <WebServer.h>
#include <Keypad.h>  
#include <Wire.h>
#include <U8g2lib.h>

// ------------------- CONFIGURACIÓN -------------------
WebServer webServer(80);
Servo cerrojoServo;

const int pinServo = 18;  
const int pinSensor = 4;
const int ledRojo = 5;
const int ledVerde = 15;
const int buzzerPin = 19;

const char* ssid = "iPhone de Matias";
const char* password = "matias06";
const char* backendUrl = "http://172.20.10.3:3000/api/eventos";

bool cerrojoAbierto = false;
bool lastCerrojoAbierto = false;
bool lastAlarmaPuertaAbierta = false;
int lastEstadoSensor = LOW;
bool sensorSimuladoAbierto = false;  // <-- SIMULACIÓN DE SENSOR
bool simulandoSensor = false; // ← AGREGAR ESTO

unsigned long ultimoMovimiento = 0;
const unsigned long intervalo = 1000;
unsigned long ultimoIntentoWiFi = 0;
const unsigned long intervaloWiFi = 10000;

// ---------- KEY PAD 4x4 ----------
const byte ROWS = 4; 
const byte COLS = 4;
char keys[ROWS][COLS] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};
byte rowPins[ROWS] = {13, 12, 14, 27};
byte colPins[COLS] = {26, 25, 33, 32};
Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

// ---------- CONTRASEÑA ----------
String contraseñaUsuario = "1234";
String entradaActual = "";
bool modoConfig = false;

// ---------- BUZZER ----------
void beepCorto() { digitalWrite(buzzerPin, HIGH); delay(100); digitalWrite(buzzerPin, LOW); }
void beepMedio() { digitalWrite(buzzerPin, HIGH); delay(300); digitalWrite(buzzerPin, LOW); }
void beepError() { for(int i = 0; i < 3; i++){ digitalWrite(buzzerPin, HIGH); delay(150); digitalWrite(buzzerPin, LOW); delay(150); } }
void melodiaDesbloqueo() { const int pattern[] = {120,120,180,240}; for (int i = 0; i < 4; i++) { digitalWrite(buzzerPin, HIGH); delay(pattern[i]); digitalWrite(buzzerPin, LOW); delay(70); } }

// ---------- SENSOR SIMULADO ----------
bool leerSensorFiltrado() {
  if (sensorSimuladoAbierto) return false;  // puerta ABIERTA simulada
  return true; // si no se simula → puerta cerrada
}

// ---------- ENVIAR EVENTO AL BACKEND ----------
void enviarEvento(String estadoCerrojo, String estadoSensor, bool alarma, String origen) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(backendUrl);
    http.addHeader("Content-Type", "application/json");

    String body = "{\"numero_caja\":1"
                  ",\"estado_cerrojo\":\"" + estadoCerrojo +
                  "\",\"estado_sensor\":\"" + estadoSensor +
                  "\",\"alarma\":" + (alarma ? "true" : "false") +
                  ",\"origen\":\"" + origen + "\"}";

    int httpResponseCode = http.POST(body);
    Serial.print("Evento enviado, respuesta HTTP: ");
    Serial.println(httpResponseCode);
    http.end();
  } else {
    Serial.println("No conectado al WiFi");
  }
}



// ---------- ACTUALIZAR ESTADO ----------
void actualizarYEnviarEstado(String origenEvento = "usuario1") {
    bool sensorDetectaIman = leerSensorFiltrado();
    bool alarma = (!cerrojoAbierto && !sensorDetectaIman);
    int estadoSensor = sensorDetectaIman ? HIGH : LOW;

    // Solo enviar evento si hay cambio
    if (cerrojoAbierto != lastCerrojoAbierto ||
        alarma != lastAlarmaPuertaAbierta ||
        estadoSensor != lastEstadoSensor) {

        enviarEvento(
            cerrojoAbierto ? "abierto" : "cerrado",
            sensorDetectaIman ? "imán detectado" : "sin imán",
            alarma,
            origenEvento    // ← aquí usamos el valor que venga

             );

        if (cerrojoAbierto && origenEvento != "keypad") scrollText("UNLOCK", 34, 1);
        if (!cerrojoAbierto && origenEvento != "keypad") scrollText("LOCK", 34, 1);

        lastCerrojoAbierto = cerrojoAbierto;
        lastAlarmaPuertaAbierta = alarma;
        lastEstadoSensor = estadoSensor;
    }

  // ---------- LEDS ----------
  static unsigned long ultimoParpadeo = 0;
  static bool estadoRojo = false;
  unsigned long ahora = millis();

  if (cerrojoAbierto) {
    digitalWrite(ledVerde, HIGH);
    digitalWrite(ledRojo, LOW);
  } 
  else if (alarma) {
    if (ahora - ultimoParpadeo >= 300) { 
      estadoRojo = !estadoRojo; 
      ultimoParpadeo = ahora; 
    }
    digitalWrite(ledRojo, estadoRojo);
    digitalWrite(ledVerde, LOW);
  } 
  else {
    digitalWrite(ledRojo, HIGH);
    digitalWrite(ledVerde, LOW);
  }
}

// ---------- CERROJO ----------
void abrirCerrojo() { cerrojoServo.write(90); cerrojoAbierto = true; beepMedio(); melodiaDesbloqueo(); }
void cerrarCerrojo() { cerrojoServo.write(0); cerrojoAbierto = false; beepMedio(); }

// ---------- ENDPOINTS ----------
void handleEstado() {
  webServer.sendHeader("Access-Control-Allow-Origin", "*");
  bool sensorDetectaIman = leerSensorFiltrado();
  bool alarma = (!cerrojoAbierto && !sensorDetectaIman);
  String json = "{\"cerrojo\":\"" + String(cerrojoAbierto ? "abierto" : "cerrado") +
                "\",\"sensor\":\"" + String(sensorDetectaIman ? "imán detectado" : "sin imán") +
                "\",\"alarma\":" + (alarma ? "true" : "false") + "}";
  webServer.send(200, "application/json", json);
}

void handleAbrir() { 
  abrirCerrojo(); 
  String origen = webServer.arg("origen"); // se puede mandar desde la web
  if (origen == "") origen = "admin"; // default admin si no envían nada
  actualizarYEnviarEstado(origen);
  webServer.send(200, "text/plain", "Cerrojo abierto"); 
}

void handleCerrar() { 
  cerrarCerrojo(); 
  String origen = webServer.arg("origen");
  if (origen == "") origen = "admin";
  actualizarYEnviarEstado(origen);
  webServer.send(200, "text/plain", "Cerrojo cerrado"); 
}


void handleSimularAlarma() { sensorSimuladoAbierto = true; webServer.send(200, "text/plain", "Puerta abierta (SIMULADA)"); }
void handleResetAlarma() { sensorSimuladoAbierto = false; webServer.send(200, "text/plain", "Puerta cerrada (SIMULADA)"); }

// ---------- DISPLAY ----------
#define I2C_SDA 16
#define I2C_SCL 17
U8G2_SH1106_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE);

void scrollText(const char* msg, int y, int speedDelay) {
  u8g2.setFont(u8g2_font_ncenB14_tr);
  int textWidth = u8g2.getStrWidth(msg);
  if (textWidth <= 128) { u8g2.clearBuffer(); u8g2.drawStr((128 - textWidth)/2, y, msg); u8g2.sendBuffer(); delay(1000); return; }
  for (int x = 128; x > -textWidth; x--) { u8g2.clearBuffer(); u8g2.drawStr(x, y, msg); u8g2.sendBuffer(); delay(speedDelay); }
}

void updateDisplay() {
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_ncenB08_tr); u8g2.drawStr(0, 12, "SmartBox");
  u8g2.setFont(u8g2_font_6x10_tr); u8g2.drawStr(0, 28, "Entrada :");
  String toShow = entradaActual.length() ? entradaActual : "-";
  u8g2.setFont(u8g2_font_ncenB14_tr); int w = u8g2.getStrWidth(toShow.c_str());
  int x = (128 - w) / 2; u8g2.drawStr(x, 56, toShow.c_str());
  u8g2.sendBuffer();
}

// ---------- SETUP ----------
void setup() {
  Serial.begin(115200);
  pinMode(pinSensor, INPUT);
  pinMode(ledRojo, OUTPUT); pinMode(ledVerde, OUTPUT); pinMode(buzzerPin, OUTPUT);

  cerrojoServo.attach(pinServo);
  cerrojoServo.write(0);

  WiFi.begin(ssid, password);
  WiFi.waitForConnectResult();
  Serial.println(WiFi.localIP());

  webServer.on("/estado", handleEstado);
  webServer.on("/abrir", handleAbrir);
  webServer.on("/cerrar", handleCerrar);
  webServer.on("/simularAlarma", handleSimularAlarma);
  webServer.on("/resetAlarma", handleResetAlarma);
  webServer.begin();

  Wire.begin(I2C_SDA, I2C_SCL);
  u8g2.begin();
  updateDisplay();
}

// ---------- LOOP ----------
void loop() {
  if (WiFi.status() != WL_CONNECTED && millis() - ultimoIntentoWiFi > intervaloWiFi) { WiFi.begin(ssid, password); ultimoIntentoWiFi = millis(); }
  actualizarYEnviarEstado();
  webServer.handleClient();

  char key = keypad.getKey();
  if (!key) return;

  beepCorto();
  Serial.println(key);

  if (!modoConfig) {
    if (isdigit(key)) { entradaActual += key; updateDisplay(); }
    else if (key == '*') { entradaActual = ""; updateDisplay(); }
    else if (key == '#') {
      if (entradaActual == contraseñaUsuario) { abrirCerrojo(); scrollText("UNLOCK", 34, 1); }
      else { beepError(); scrollText("ERROR", 34, 2); }
      entradaActual = ""; updateDisplay();
    }
    else if (key == 'A' && cerrojoAbierto) { modoConfig = true; entradaActual = ""; scrollText("CONF", 34, 1); updateDisplay(); }
    else if (key == 'C' && cerrojoAbierto) { cerrarCerrojo(); updateDisplay(); }
  } 
  else {
    if (isdigit(key)) { entradaActual += key; updateDisplay(); }
    else if (key == '*') { entradaActual = ""; modoConfig = false; scrollText("CANC", 34, 1); updateDisplay(); }
    else if (key == '#') { contraseñaUsuario = entradaActual; modoConfig = false; cerrarCerrojo(); entradaActual = ""; scrollText("PIN OK", 34, 1); updateDisplay(); }
  }
}
