#include <WiFi.h>
#include <HTTPClient.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>
#include <WebServer.h>

WebServer webServer(80);
Servo cerrojoServo;

const int pinServo = 18;
const int pinSensor = 4;

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

bool leerSensorFiltrado() {
  int suma = 0;
  for (int i = 0; i < 10; i++) {
    suma += digitalRead(pinSensor);
    delay(1);
  }
  return (suma <= 3);
}

void enviarEvento(String estadoCerrojo, String estadoSensor, bool alarma) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(backendUrl);
    http.addHeader("Content-Type", "application/json");

    String body = "{\"estadoCerrojo\":\"" + estadoCerrojo +
                  "\",\"estadoSensor\":\"" + estadoSensor +
                  "\",\"alarma\":" + (alarma ? "true" : "false") + "}";

    int httpResponseCode = http.POST(body);
    Serial.print("Evento enviado, respuesta HTTP: ");
    Serial.println(httpResponseCode);
    http.end();
  } else {
    Serial.println("No conectado al WiFi, no se puede enviar evento");
  }
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
}

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
    cerrojoServo.write(90);
    cerrojoAbierto = true;
    ultimoMovimiento = millis();
    Serial.println("Cerrojo ABIERTO");
    actualizarYEnviarEstado();
  }
  webServer.sendHeader("Access-Control-Allow-Origin", "*");
  webServer.send(200, "text/plain", "Cerrojo abierto");
}

void handleCerrar() {
  if (cerrojoAbierto && (millis() - ultimoMovimiento > intervalo)) {
    cerrojoServo.write(0);
    cerrojoAbierto = false;
    ultimoMovimiento = millis();
    Serial.println("Cerrojo CERRADO");
    actualizarYEnviarEstado();
  }
  webServer.sendHeader("Access-Control-Allow-Origin", "*");
  webServer.send(200, "text/plain", "Cerrojo cerrado");
}

void setup() {
  Serial.begin(115200);
  pinMode(pinSensor, INPUT);
  cerrojoServo.attach(pinServo);
  cerrojoServo.write(0);

  WiFi.begin(ssid, password);
  Serial.print("Conectando a WiFi: ");
  Serial.println(ssid);

  if (WiFi.waitForConnectResult() == WL_CONNECTED) {
    Serial.print("Conectado! IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("No se pudo conectar al WiFi");
  }

  webServer.on("/estado", HTTP_GET, handleEstado);
  webServer.on("/abrir", HTTP_GET, handleAbrir);
  webServer.on("/cerrar", HTTP_GET, handleCerrar);

  webServer.begin();
  actualizarYEnviarEstado();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED && millis() - ultimoIntentoWiFi > intervaloWiFi) {
    Serial.println("WiFi desconectado. Intentando reconectar...");
    WiFi.begin(ssid, password);
    ultimoIntentoWiFi = millis();
  }

  actualizarYEnviarEstado();
  webServer.handleClient();
}
