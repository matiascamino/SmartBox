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

const int ledRojo = 21;
const int ledVerde = 2;

const int buzzerPin = 19;

const char* ssid = "iPhone de Matias";
const char* password = "matias06";
const char* backendUrl = "http://172.20.10.5:3000/api/eventos";

bool cerrojoAbierto = false;
bool lastCerrojoAbierto = false;
bool lastAlarmaPuertaAbierta = false;
int lastEstadoSensor = LOW;

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
void beepCorto() {
  digitalWrite(buzzerPin, HIGH); delay(100); digitalWrite(buzzerPin, LOW);
}
void beepMedio() {
  digitalWrite(buzzerPin, HIGH); delay(300); digitalWrite(buzzerPin, LOW);
}
void beepError() {
  for(int i = 0; i < 3; i++){
    digitalWrite(buzzerPin, HIGH); delay(150);
    digitalWrite(buzzerPin, LOW); delay(150);
  }
}
void melodiaDesbloqueo() {
  const int pattern[] = {120,120,180,240};
  for (int i = 0; i < 4; i++) {
    digitalWrite(buzzerPin, HIGH);
    delay(pattern[i]);
    digitalWrite(buzzerPin, LOW);
    delay(70);
  }
}

// ---------- SENSOR ----------
bool leerSensorFiltrado() {
  int suma = 0;
  for (int i = 0; i < 10; i++) { suma += digitalRead(pinSensor); delay(1); }
  return (suma <= 3);
}

// ---------- ENVÍO AL BACKEND ----------
void enviarEvento(String estadoCerrojo, String estadoSensor, bool alarma) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(backendUrl);
    http.addHeader("Content-Type", "application/json");
    String body = "{\"numero_caja\":1"
                  ",\"estado_cerrojo\":\"" + estadoCerrojo +
                  "\",\"estado_sensor\":\"" + estadoSensor +
                  "\",\"alarma\":" + (alarma ? "true" : "false") +
                  ",\"origen\":\"Usuario1\"}";
    int httpResponseCode = http.POST(body);
    Serial.print("Evento enviado, respuesta HTTP: ");
    Serial.println(httpResponseCode);
    http.end();
  } else Serial.println("No conectado al WiFi");
}

void actualizarYEnviarEstado() {
  bool sensorDetectaIman = leerSensorFiltrado();
  bool alarma = (!cerrojoAbierto && !sensorDetectaIman);
  int estadoSensor = sensorDetectaIman ? HIGH : LOW;

  if (cerrojoAbierto != lastCerrojoAbierto ||
      alarma != lastAlarmaPuertaAbierta ||
      estadoSensor != lastEstadoSensor) {

    enviarEvento(
      cerrojoAbierto ? "abierto" : "cerrado",
      sensorDetectaIman ? "imán detectado" : "sin imán",
      alarma
    );

    lastCerrojoAbierto = cerrojoAbierto;
    lastAlarmaPuertaAbierta = alarma;
    lastEstadoSensor = estadoSensor;
  }

  // --------- NUEVA LÓGICA LED ---------
  static unsigned long ultimoParpadeo = 0;
  static bool estadoRojo = false;
  unsigned long ahora = millis();

  if (cerrojoAbierto) {
    digitalWrite(ledVerde, HIGH);
    digitalWrite(ledRojo, LOW);
  } 
  else if (alarma) {
    if (ahora - ultimoParpadeo >= 300) {  // velocidad parpadeo
      estadoRojo = !estadoRojo;
      digitalWrite(ledRojo, estadoRojo);
      ultimoParpadeo = ahora;
    }
    digitalWrite(ledVerde, LOW);
  } 
  else {
    digitalWrite(ledRojo, HIGH);
    digitalWrite(ledVerde, LOW);
  }
}

// ---------- CERROJO ----------
void abrirCerrojo() {
  cerrojoServo.write(90);
  cerrojoAbierto = true;
  ultimoMovimiento = millis();
  Serial.println("Cerrojo ABIERTO");
  beepMedio();
  melodiaDesbloqueo();
}
void cerrarCerrojo() {
  cerrojoServo.write(0);
  cerrojoAbierto = false;
  ultimoMovimiento = millis();
  Serial.println("Cerrojo CERRADO");
  beepMedio();
}

// ---------- WEB ----------
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
  if (!cerrojoAbierto && (millis() - ultimoMovimiento > intervalo)) {
    abrirCerrojo(); actualizarYEnviarEstado();
  }
  webServer.sendHeader("Access-Control-Allow-Origin", "*");
  webServer.send(200, "text/plain", "Cerrojo abierto");
}
void handleCerrar() {
  if (cerrojoAbierto && (millis() - ultimoMovimiento > intervalo)) {
    cerrarCerrojo(); actualizarYEnviarEstado();
  }
  webServer.sendHeader("Access-Control-Allow-Origin", "*");
  webServer.send(200, "text/plain", "Cerrojo cerrado");
}

// ---------- DISPLAY ----------
#define I2C_SDA 16
#define I2C_SCL 17
U8G2_SH1106_128X64_NONAME_F_HW_I2C u8g2(U8G2_R0, U8X8_PIN_NONE);

void scrollText(const char* msg, int y, int speedDelay) {
  u8g2.setFont(u8g2_font_ncenB14_tr);
  int textWidth = u8g2.getStrWidth(msg);
 
  if (textWidth <= 128) {
    u8g2.clearBuffer();
    int x = (128 - textWidth) / 2;
    u8g2.drawStr(x, y, msg);
    u8g2.sendBuffer();
    delay(1000);
    return;
  }

  for (int x = 128; x > -textWidth; x--) {
    u8g2.clearBuffer();
    u8g2.drawStr(x, y, msg);
    u8g2.sendBuffer();
    delay(speedDelay);
  }
}

void updateDisplay() {
  u8g2.clearBuffer();
  u8g2.setFont(u8g2_font_ncenB08_tr);
  u8g2.drawStr(0, 12, "SmartBox");
  u8g2.setFont(u8g2_font_6x10_tr);
  u8g2.drawStr(0, 28, "Entrada :");

  String toShow = entradaActual.length() ? entradaActual : "-";
  u8g2.setFont(u8g2_font_ncenB14_tr);
  int w = u8g2.getStrWidth(toShow.c_str());
  int x = (128 - w) / 2; if (x < 0) x = 0;
  u8g2.drawStr(x, 56, toShow.c_str());

  u8g2.sendBuffer();
}

// ---------- SETUP ----------
void setup() {
  Serial.begin(115200);
  pinMode(pinSensor, INPUT);
  pinMode(ledRojo, OUTPUT);
  pinMode(ledVerde, OUTPUT);
  pinMode(buzzerPin, OUTPUT);
  digitalWrite(buzzerPin, LOW);

  digitalWrite(ledRojo, LOW);
  digitalWrite(ledVerde, LOW);

  cerrojoServo.attach(pinServo);
  cerrojoServo.write(0);

  WiFi.begin(ssid, password);
  Serial.print("Conectando a WiFi: "); Serial.println(ssid);
  if (WiFi.waitForConnectResult() == WL_CONNECTED)
    Serial.println(WiFi.localIP());
  else Serial.println("No se pudo conectar al WiFi");

  webServer.on("/estado", HTTP_GET, handleEstado);
  webServer.on("/abrir", HTTP_GET, handleAbrir);
  webServer.on("/cerrar", HTTP_GET, handleCerrar);
  webServer.begin();

  Wire.begin(I2C_SDA, I2C_SCL);
  u8g2.begin();
  updateDisplay();
}

// ---------- LOOP ----------
void loop() {
  if (WiFi.status() != WL_CONNECTED && millis() - ultimoIntentoWiFi > intervaloWiFi) {
    WiFi.begin(ssid, password);
    ultimoIntentoWiFi = millis();
  }

  actualizarYEnviarEstado();
  webServer.handleClient();

  char key = keypad.getKey();
  if (key) {
    Serial.println(key);
    beepCorto();

    if (!modoConfig) {
      if (isdigit(key)) { entradaActual += key; updateDisplay(); }
      else if (key == '*') { entradaActual = ""; updateDisplay(); }
      else if (key == '#') {
        if (entradaActual == contraseñaUsuario) {
          abrirCerrojo();
          scrollText("DESBLOQUEADO", 34, 3);
          entradaActual = "";
          updateDisplay();
        } else {
          beepError();
          scrollText("ERROR", 34, 5);
          updateDisplay();
        }
        entradaActual = "";
      } else if (key == 'A' && cerrojoAbierto) {
        modoConfig = true;
        entradaActual = "";
        scrollText("CONFIGURACION", 34, 3);
        updateDisplay();
      } else if (key == 'C' && cerrojoAbierto) {
        cerrarCerrojo();
        actualizarYEnviarEstado();
        updateDisplay();
      }
    } else {
      if (isdigit(key)) { entradaActual += key; updateDisplay(); }
      else if (key == '*') {
        entradaActual = "";
        modoConfig = false;
        scrollText("CANCELADO", 34, 3);
        updateDisplay();
      } else if (key == '#') {
        contraseñaUsuario = entradaActual;
        modoConfig = false;
        cerrarCerrojo();
        entradaActual = "";
        scrollText("PIN GUARDADO", 34, 3);
        updateDisplay();
      }
    }
  }
}
