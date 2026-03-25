#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include "DHT.h"
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

// ---------------- CONFIG ----------------
#define SAMPLING_TIME 10000   // 10 sec for testing (change to 30000 for final)

// ---------------- PINS ----------------
#define MQ2_PIN 34
#define LDR_PIN 35
#define DHTPIN 4
#define DHTTYPE DHT22
#define TRIG_PIN 5
#define ECHO_PIN 18

#define BUZZER 14
#define GREEN_LED 25
#define YELLOW_LED 26
#define RED_LED 27

// ---------------- OBJECTS ----------------
DHT dht(DHTPIN, DHTTYPE);
LiquidCrystal_I2C lcd(0x27, 16, 2);
Adafruit_MPU6050 mpu;

// ---------------- VARIABLES ----------------
float gasPercent, temp, hum, lightLevel, distance, accelX;
String status = "SAFE";

// ---------------- FUNCTIONS ----------------

// Ultrasonic
float readDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  if (duration == 0) return -1;

  return duration * 0.034 / 2;
}

// Alerts
void updateAlerts(String st) {
  digitalWrite(GREEN_LED, LOW);
  digitalWrite(YELLOW_LED, LOW);
  digitalWrite(RED_LED, LOW);
  digitalWrite(BUZZER, LOW);

  if (st == "SAFE") {
    digitalWrite(GREEN_LED, HIGH);
  } 
  else if (st == "WARNING") {
    digitalWrite(YELLOW_LED, HIGH);
    tone(BUZZER, 1000, 200);
  } 
  else {
    digitalWrite(RED_LED, HIGH);
    digitalWrite(BUZZER, HIGH);
  }
}

// LCD
void displayStatus() {
  lcd.clear();

  lcd.setCursor(0, 0);
  if (status == "SAFE") lcd.print("SAFE TO ENTER");
  else if (status == "WARNING") lcd.print("WARNING!");
  else lcd.print("DANGER!");

  lcd.setCursor(0, 1);
  lcd.print("Gas:");
  lcd.print(gasPercent, 0);
  lcd.print("%");
}

// ---------------- SETUP ----------------
void setup() {
  Serial.begin(115200);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  pinMode(BUZZER, OUTPUT);
  pinMode(GREEN_LED, OUTPUT);
  pinMode(YELLOW_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);

  dht.begin();

  lcd.init();
  lcd.backlight();

  Wire.begin();

  if (!mpu.begin()) {
    Serial.println("⚠ MPU6050 not detected");
  } else {
    Serial.println("✅ MPU6050 Ready");
  }

  Serial.println("🚀 VeerProbe System Ready");
}

// ---------------- LOOP ----------------
void loop() {

  Serial.println("\n🔍 Starting Inspection...");

  float totalGas = 0, totalTemp = 0, totalHum = 0;
  float totalLight = 0, totalDist = 0;
  int count = 0;

  unsigned long startTime = millis();

  // -------- SAMPLING LOOP --------
  while (millis() - startTime < SAMPLING_TIME) {

    // Gas
    int gasRaw = analogRead(MQ2_PIN);
    float gas = (gasRaw / 4095.0) * 100;
    totalGas += gas;

    // DHT
    float t = dht.readTemperature();
    float h = dht.readHumidity();
    if (!isnan(t)) totalTemp += t;
    if (!isnan(h)) totalHum += h;

    // LDR
    int ldrRaw = analogRead(LDR_PIN);
    float light = (ldrRaw / 4095.0) * 100;
    totalLight += light;

    // Ultrasonic
    float dist = readDistance();
    if (dist != -1) totalDist += dist;

    count++;

    Serial.print("Sampling... ");
    Serial.println(count);

    delay(1000);
  }

  // -------- AVERAGE --------
  gasPercent = totalGas / count;
  temp = totalTemp / count;
  hum = totalHum / count;
  lightLevel = totalLight / count;
  distance = totalDist / count;

  // MPU (single read)
  sensors_event_t a, g, temp_mpu;
  if (mpu.begin()) {
    mpu.getEvent(&a, &g, &temp_mpu);
    accelX = a.acceleration.x;
  }

  // -------- DECISION --------
  if (gasPercent > 70 || distance < 10 || lightLevel < 20) {
    status = "DANGER";
  }
  else if (gasPercent > 40) {
    status = "WARNING";
  }
  else {
    status = "SAFE";
  }

  // -------- OUTPUT --------
  updateAlerts(status);
  displayStatus();

  // -------- SERIAL --------
  Serial.println("------ RESULT ------");
  Serial.print("Gas: "); Serial.println(gasPercent);
  Serial.print("Temp: "); Serial.println(temp);
  Serial.print("Humidity: "); Serial.println(hum);
  Serial.print("Light: "); Serial.println(lightLevel);
  Serial.print("Distance: "); Serial.println(distance);
  Serial.print("Tilt: "); Serial.println(accelX);
  Serial.print("STATUS: "); Serial.println(status);
  Serial.println("--------------------");

  delay(5000);
}
