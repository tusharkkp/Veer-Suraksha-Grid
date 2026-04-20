/*
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║       VEER SURAKSHA GRID — ESP32 FIRMWARE  v6.0 (Firebase)      ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  PHASE 1 : VEER PROBE  — Pre-Inspection (MPU6050 excluded)      ║
 * ║            10 readings → average → classify → push to Firebase  ║
 * ║  PHASE 2 : VEER GUARD  — Continuous monitoring, all sensors     ║
 * ║            Push to Firebase every 5 seconds                     ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  SENSOR → FIREBASE FIELD MAPPING                                 ║
 * ║  MQ2  AOUT  → H2S        (treated as H2S sensor)               ║
 * ║  MQ4  AOUT  → CH4        (Methane)                             ║
 * ║  MQ7  AOUT  → CO         (Carbon Monoxide)                     ║
 * ║  DHT11      → temperature, humidity                             ║
 * ║  HC-SR04    → water_depth (cm)                                  ║
 * ║  MAX30102   → oxygen      (SpO2 %, SIMULATED — sensor damaged)  ║
 * ║  Push Btn   → sos         (bool)                                ║
 * ║  MPU6050    → fall_detected, no_movement  (Phase 2 only)       ║
 * ║  classify() → status      ("SAFE" / "WARNING" / "DANGER")      ║
 * ║  NTP        → timestamp   (Unix epoch, seconds)                 ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  FIREBASE DB PATH                                                ║
 * ║  telemetry/Worker1/VeerProbe   ← written once after probe done  ║
 * ║  telemetry/Worker1/VeerGuard   ← updated every 5 seconds        ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  HARDWARE CONNECTIONS                                            ║
 * ║  Red  LED      → GPIO 25  (220Ω to GND)                        ║
 * ║  Yellow LED    → GPIO 26  (220Ω to GND)                        ║
 * ║  Green LED     → GPIO 27  (220Ω to GND)                        ║
 * ║  Buzzer        → GPIO 23                                        ║
 * ║  Push Button   → GPIO 19  (INPUT_PULLUP, active LOW)           ║
 * ║  DHT11 DATA    → GPIO 13  (10kΩ pull-up to 3.3V)              ║
 * ║  MQ2  AOUT     → GPIO 34  (5V powered, analog input only)      ║
 * ║  MQ4  AOUT     → GPIO 35  (5V powered, analog input only)      ║
 * ║  MQ7  AOUT     → GPIO 32  (5V powered)                         ║
 * ║  HC-SR04 TRIG  → GPIO 5                                        ║
 * ║  HC-SR04 ECHO  → GPIO 18  (1kΩ + 2kΩ voltage divider)         ║
 * ║  GY-521 SDA    → GPIO 21 │ SCL → GPIO 22  AD0 → GND           ║
 * ║  OLED    SDA   → GPIO 21 │ SCL → GPIO 22  (shared I2C)        ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  LIBRARIES — install via Arduino Library Manager                ║
 * ║  • Adafruit SSD1306                                             ║
 * ║  • Adafruit GFX Library                                         ║
 * ║  • DHT sensor library  (Adafruit)                               ║
 * ║  • Adafruit Unified Sensor                                      ║
 * ║  • MPU6050 by Electronic Cats  (search: "MPU6050 Electronic")   ║
 * ║    ── Do NOT use Adafruit MPU6050 (rejects GY-521 clone chip)  ║
 * ║  • Firebase ESP Client  by Mobizt  (search: "Firebase ESP")     ║
 * ║    ── Do NOT install SparkFun MAX3010x (sensor damaged+removed) ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

// ─────────────────────────────────────────────────────────────────
//  >>>  PASTE YOUR CREDENTIALS HERE  <<<
// ─────────────────────────────────────────────────────────────────
#define WIFI_SSID        "VeerEdge"
#define WIFI_PASSWORD    "12345678"

// Firebase Realtime Database URL  (e.g. "https://my-project-default-rtdb.firebaseio.com")
#define FIREBASE_URL     "https://veer-e0727-default-rtdb.firebaseio.com/"

// Firebase Database Secret  (Firebase Console → Project Settings → Service Accounts → Database secrets)
#define FIREBASE_SECRET  "cgBzt7hjHY0x7c9pyVfVco61kYDq7OLWF8u9j1gx"

// Firebase DB path — worker identifier
#define WORKER_PATH      "telemetry/Worker1"
// ─────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────
//  INCLUDES
// ─────────────────────────────────────────────────────────────────
#include <Wire.h>
#include <WiFi.h>
#include <time.h>                        // NTP timestamp (built-in ESP32)
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHT.h>
#include <MPU6050.h>                     // Electronic Cats — works with GY-521 clone (WHO_AM_I=0x70)
#include <Firebase_ESP_Client.h>         // Mobizt Firebase ESP Client
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"
#include <math.h>

// ─────────────────────────────────────────────────────────────────
//  PIN DEFINITIONS
// ─────────────────────────────────────────────────────────────────
#define PIN_LED_RED      25
#define PIN_LED_YELLOW   26
#define PIN_LED_GREEN    27
#define PIN_BUZZER       23
#define PIN_BUTTON       19    // INPUT_PULLUP — active LOW (SOS)
#define PIN_DHT          13
#define DHT_TYPE         DHT11
#define PIN_MQ2          34   // H2S  (MQ2 treated as H2S)
#define PIN_MQ4          35   // CH4  (Methane)
#define PIN_MQ7          32   // CO   (Carbon Monoxide)
#define PIN_TRIG          5
#define PIN_ECHO         18   // After 1kΩ + 2kΩ voltage divider

// ─────────────────────────────────────────────────────────────────
//  OLED
// ─────────────────────────────────────────────────────────────────
#define SCREEN_W   128
#define SCREEN_H    64
#define OLED_ADDR 0x3C
Adafruit_SSD1306 oled(SCREEN_W, SCREEN_H, &Wire, -1);

// ─────────────────────────────────────────────────────────────────
//  SENSOR OBJECTS
// ─────────────────────────────────────────────────────────────────
DHT     dht(PIN_DHT, DHT_TYPE);
MPU6050 mpu;
bool    mpuOK = false;

// ─────────────────────────────────────────────────────────────────
//  FIREBASE OBJECTS
// ─────────────────────────────────────────────────────────────────
FirebaseData   fbdo;
FirebaseAuth   auth;
FirebaseConfig fbConfig;
bool           firebaseReady = false;

// Firebase push interval for VeerGuard (ms) — do NOT push every second,
// Firebase has a 1 write/s limit on the free Spark plan per path.
const unsigned long FB_PUSH_INTERVAL = 5000UL;
unsigned long       lastFBPush       = 0;

// ─────────────────────────────────────────────────────────────────
//  NTP
// ─────────────────────────────────────────────────────────────────
const char* NTP_SERVER   = "pool.ntp.org";
const long  GMT_OFFSET   = 19800L;   // IST = UTC+5:30 = 19800 seconds
const int   DST_OFFSET   = 0;

// ─────────────────────────────────────────────────────────────────
//  MPU6050 CONVERSION  (±8g range → 4096 LSB/g)
// ─────────────────────────────────────────────────────────────────
const float MPU_SENSITIVITY = 16384.0f;
const float GRAVITY         = 9.81f;

// ─────────────────────────────────────────────────────────────────
//  THRESHOLDS
// ─────────────────────────────────────────────────────────────────
const int   MQ2_WARN             = 4000;   // H2S  ADC
const int   MQ2_DANGER           = 4095;
const int   MQ4_WARN             = 2500;   // CH4  ADC
const int   MQ4_DANGER           = 3000;
const int   MQ7_WARN             = 2000;   // CO   ADC
const int   MQ7_DANGER           = 3000;
const float TEMP_WARN            = 45.0f;
const float TEMP_DANGER          = 55.0f;
const float HUM_WARN             = 85.0f;
const float HUM_DANGER           = 95.0f;
const float DIST_WARN            = 60.0f;  // cm — water depth
const float DIST_DANGER          = 30.0f;
const int   HR_LOW_WARN          = 55;
const int   HR_HIGH_WARN         = 110;
const int   HR_LOW_DANGER        = 45;
const int   HR_HIGH_DANGER       = 130;
const int   SPO2_WARN            = 95;
const int   SPO2_DANGER          = 90;
const float ACCEL_WARN           = 15.0f;  // m/s²
const float ACCEL_DANGER         = 22.0f;
const float MOTION_DELTA_THRESH  = 0.5f;
const unsigned long NO_MOTION_MS = 15000UL;

// ─────────────────────────────────────────────────────────────────
//  STATUS
// ─────────────────────────────────────────────────────────────────
enum Status { SAFE, WARNING, DANGER };

// ─────────────────────────────────────────────────────────────────
//  PHASE 1 — VEER PROBE STATE
// ─────────────────────────────────────────────────────────────────
const int PROBE_READINGS = 10;
int  probeCount    = 0;
bool probeComplete = false;

long  pMQ2 = 0, pMQ4 = 0, pMQ7 = 0;
float pTemp = 0, pHum = 0, pDist = 0;
long  pHR = 0, pSp = 0;

float avgMQ2, avgMQ4, avgMQ7;
float avgTemp, avgHum, avgDist;
float avgHR, avgSpO2;

// ─────────────────────────────────────────────────────────────────
//  PHASE 2 — VEER GUARD STATE
// ─────────────────────────────────────────────────────────────────
Status liveStatus   = SAFE;
bool   sosActive    = false;

unsigned long lastBuzz     = 0;
bool          buzzState    = false;
unsigned long lastPage     = 0;
byte          oledPage     = 0;
unsigned long lastRead     = 0;
const unsigned long READ_MS = 1000;

unsigned long lastMotionAt  = 0;
float         prevAccelMag  = 9.81f;
bool          noMotionDanger = false;

// ─────────────────────────────────────────────────────────────────
//  SIMULATED MAX30102  (sensor physically damaged)
// ─────────────────────────────────────────────────────────────────
int simHR   = 78;
int simSpO2 = 98;

void updateSimulatedVitals() {
  simHR   = constrain(simHR   + ((int)(esp_random() % 5) - 2), 65, 100);
  simSpO2 = constrain(simSpO2 + ((int)(esp_random() % 3) - 1), 97,  99);
}

// ─────────────────────────────────────────────────────────────────
//  FORWARD DECLARATIONS
// ─────────────────────────────────────────────────────────────────
float       readDistance();
long        getEpoch();
Status      classify(float mq2, float mq4, float mq7,
                     float temp, float hum, float dist,
                     int hr, int sp,
                     float accMag, bool useAccel, bool noMotion);
void        setLEDs(Status s);
void        handleBuzzer(Status s);
const char* sName(Status s);

void connectWiFi();
void initFirebase();
void pushProbeResult(float mq2, float mq4, float mq7,
                     float temp, float hum, float dist,
                     int sp, bool sos, Status s);
void pushGuardData(float mq2, float mq4, float mq7,
                   float temp, float hum, float dist,
                   int sp, bool sos,
                   bool fall, bool noMov, Status s);
void pushSOS();

void oledWelcome();
void oledWiFiConnecting();
void oledWiFiConnected(String ip);
void oledFirebaseOK();
void oledInitPhase1();
void oledProbeReading(int n, float mq2, float mq4, float mq7,
                      float temp, float hum, float dist, int hr, int sp);
void oledProbeAvg();
void oledProbeResult(Status s);
void oledPhase2Start();
void oledGuard(float mq2, float mq4, float mq7,
               float temp, float hum, float dist,
               int hr, int sp,
               float ax, float ay, float az, float mag,
               bool noMotion, Status s);

void serialProbeReading(int n, float mq2, float mq4, float mq7,
                        float temp, float hum, float dist, int hr, int sp);
void serialProbeAvg(Status s);
void serialGuard(float mq2, float mq4, float mq7,
                 float temp, float hum, float dist,
                 int hr, int sp,
                 float ax, float ay, float az, float mag,
                 bool noMotion, Status s);

// ═════════════════════════════════════════════════════════════════
//  SETUP
// ═════════════════════════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  delay(300);

  // ── GPIO ───────────────────────────────────────────────────────
  pinMode(PIN_LED_RED,    OUTPUT);
  pinMode(PIN_LED_YELLOW, OUTPUT);
  pinMode(PIN_LED_GREEN,  OUTPUT);
  pinMode(PIN_BUZZER,     OUTPUT);
  pinMode(PIN_TRIG,       OUTPUT);
  pinMode(PIN_ECHO,       INPUT);
  pinMode(PIN_BUTTON,     INPUT_PULLUP);
  digitalWrite(PIN_BUZZER,     LOW);
  digitalWrite(PIN_LED_RED,    LOW);
  digitalWrite(PIN_LED_YELLOW, LOW);
  digitalWrite(PIN_LED_GREEN,  LOW);

  // ── I2C — single explicit init, standard speed for boot ────────
  Wire.begin(21, 22);
  Wire.setClock(100000);
  delay(300);

  // ── OLED — first device init ───────────────────────────────────
  if (!oled.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR)) {
    Serial.println(F("[FATAL] OLED not found!"));
    while (true) delay(1000);
  }
  oled.setTextColor(SSD1306_WHITE);
  oledWelcome();
  Serial.println(F("\n╔═══════════════════════════════════════╗"));
  Serial.println(F("║      VEER SURAKSHA GRID  v6.0         ║"));
  Serial.println(F("║   Manhole Worker Safety + Firebase    ║"));
  Serial.println(F("╚═══════════════════════════════════════╝\n"));
  delay(2500);

  // ── GY-521 / MPU6500 — raw I2C init (bypasses testConnection) ──
  // WHY RAW: testConnection() fails for WHO_AM_I=0x70 (clone chip).
  // We verify presence via I2C ACK, wake from sleep, set range directly.
  Wire.beginTransmission(0x68);
  bool mpuPresent = (Wire.endTransmission() == 0);
  if (mpuPresent) {
    // Wake from sleep  (PWR_MGMT_1 reg 0x6B = 0x00)
    Wire.beginTransmission(0x68);
    Wire.write(0x6B); Wire.write(0x00);
    Wire.endTransmission();
    delay(100);
    // Set ±8g range  (ACCEL_CONFIG reg 0x1C = 0x10)
    Wire.beginTransmission(0x68);
    Wire.write(0x1C); Wire.write(0x10);
    Wire.endTransmission();
    delay(10);
    mpu.initialize();
    delay(50);
    mpuOK = true;
    lastMotionAt = millis();
    Serial.println(F("[OK] GY-521/MPU6500 — raw init, WHO_AM_I=0x70 accepted"));
  } else {
    Serial.println(F("[WARN] No device at 0x68 — check GY-521 wiring"));
  }

  // ── DHT11 ──────────────────────────────────────────────────────
  dht.begin();
  Serial.println(F("[OK] DHT11 — GPIO 13"));

  // ── Simulated vitals seed ──────────────────────────────────────
  simHR   = 72 + (int)(esp_random() % 10);
  simSpO2 = 97 + (int)(esp_random() % 3);

  // ── Raise I2C clock after all devices awake ────────────────────
  Wire.setClock(400000);

  // ── WiFi ───────────────────────────────────────────────────────
  connectWiFi();

  // ── NTP time sync ─────────────────────────────────────────────
  configTime(GMT_OFFSET, DST_OFFSET, NTP_SERVER);
  Serial.print(F("[NTP] Syncing time"));
  time_t now = 0;
  for (int i = 0; i < 20 && now < 100000; i++) {
    delay(500); time(&now);
    Serial.print(".");
  }
  Serial.println(now > 100000 ? F(" OK") : F(" FAILED (using millis)"));

  // ── Firebase init ──────────────────────────────────────────────
  initFirebase();

  // ── Phase 1 start screen ──────────────────────────────────────
  oledInitPhase1();
  Serial.println(F("\n══════════════════════════════════════════"));
  Serial.println(F("  PHASE 1 — VEER PROBE  (Pre-Inspection)"));
  Serial.println(F("  Probe in manhole. Collecting 10 readings."));
  Serial.println(F("  DO NOT ENTER YET."));
  Serial.println(F("══════════════════════════════════════════\n"));
  delay(2500);
}

// ═════════════════════════════════════════════════════════════════
//  MAIN LOOP
// ═════════════════════════════════════════════════════════════════
void loop() {

  // ── SOS Button — always checked first ─────────────────────────
  if (digitalRead(PIN_BUTTON) == LOW) {
    sosActive = true;
    Serial.println(F("\n!!! SOS BUTTON ACTIVATED !!!"));
    oled.clearDisplay();
    oled.setTextSize(2);
    oled.setCursor(20, 4);  oled.println(F("!! SOS !!"));
    oled.setTextSize(1);
    oled.setCursor(4,  36); oled.println(F("EMERGENCY ALERT SENT!"));
    oled.setCursor(14, 50); oled.println(F("HELP IS ON THE WAY"));
    oled.display();
    setLEDs(DANGER);
    // Push SOS immediately to Firebase
    pushSOS();
    for (int i = 0; i < 9; i++) {
      digitalWrite(PIN_BUZZER, HIGH); delay(120);
      digitalWrite(PIN_BUZZER, LOW);  delay(80);
    }
    delay(1000);
    sosActive = false;
    return;
  }

  unsigned long now = millis();
  if (now - lastRead < READ_MS) return;
  lastRead = now;

  // ═══════════════════════════════════════════════════════════════
  //  PHASE 1 — VEER PROBE
  // ═══════════════════════════════════════════════════════════════
  if (!probeComplete) {
    float mq2  = (float)analogRead(PIN_MQ2);
    float mq4  = (float)analogRead(PIN_MQ4);
    float mq7  = (float)analogRead(PIN_MQ7);
    float temp = dht.readTemperature();
    float hum  = dht.readHumidity();
    if (isnan(temp)) temp = 0.0f;
    if (isnan(hum))  hum  = 0.0f;
    float dist = readDistance();
    updateSimulatedVitals();
    int curHR = simHR, curSp = simSpO2;

    pMQ2 += (long)mq2; pMQ4 += (long)mq4; pMQ7 += (long)mq7;
    pTemp += temp; pHum += hum; pDist += dist;
    pHR += curHR; pSp += curSp;
    probeCount++;

    serialProbeReading(probeCount, mq2, mq4, mq7, temp, hum, dist, curHR, curSp);
    oledProbeReading(probeCount, mq2, mq4, mq7, temp, hum, dist, curHR, curSp);

    if (probeCount >= PROBE_READINGS) {
      // ── Averages ──────────────────────────────────────────────
      avgMQ2  = (float)pMQ2 / PROBE_READINGS;
      avgMQ4  = (float)pMQ4 / PROBE_READINGS;
      avgMQ7  = (float)pMQ7 / PROBE_READINGS;
      avgTemp = pTemp / PROBE_READINGS;
      avgHum  = pHum  / PROBE_READINGS;
      avgDist = pDist / PROBE_READINGS;
      avgHR   = (float)pHR / PROBE_READINGS;
      avgSpO2 = (float)pSp / PROBE_READINGS;

      oledProbeAvg();
      delay(3500);

      Status probeStatus = classify(avgMQ2, avgMQ4, avgMQ7,
                                    avgTemp, avgHum, avgDist,
                                    (int)avgHR, (int)avgSpO2,
                                    0.0f, false, false);

      serialProbeAvg(probeStatus);
      oledProbeResult(probeStatus);
      setLEDs(probeStatus);

      // ── Push Probe result to Firebase ─────────────────────────
      pushProbeResult(avgMQ2, avgMQ4, avgMQ7,
                      avgTemp, avgHum, avgDist,
                      (int)avgSpO2, false, probeStatus);

      if (probeStatus == DANGER) {
        for (int b = 0; b < 12; b++) {
          digitalWrite(PIN_BUZZER, HIGH); delay(200);
          digitalWrite(PIN_BUZZER, LOW);  delay(150);
        }
        delay(4000);
        Serial.println(F("\n[VEER PROBE] !! DANGER — Worker MUST NOT enter !!"));
        oled.clearDisplay();
        oled.setTextSize(1);
        oled.setCursor(0,  0); oled.println(F("=== VEER PROBE ==="));
        oled.setTextSize(2);
        oled.setCursor(0, 14); oled.println(F("!! DANGER"));
        oled.setTextSize(1);
        oled.setCursor(0, 40); oled.println(F("  DO NOT ENTER!"));
        oled.setCursor(0, 52); oled.println(F("  Reboot to retry."));
        oled.display();
        while (true) {
          for (int b = 0; b < 3; b++) {
            digitalWrite(PIN_BUZZER, HIGH); delay(300);
            digitalWrite(PIN_BUZZER, LOW);  delay(200);
          }
          delay(2500);
        }
      }

      // SAFE or WARNING → Phase 2
      probeComplete = true;
      lastMotionAt  = millis();
      prevAccelMag  = 9.81f;
      lastFBPush    = 0;   // force immediate first push in Phase 2
      oledPhase2Start();
      Serial.println(F("\n══════════════════════════════════════════"));
      Serial.println(F("  PHASE 2 — VEER GUARD ACTIVATED"));
      Serial.println(F("  Worker may enter. Firebase live."));
      Serial.println(F("══════════════════════════════════════════\n"));
      delay(3000);
    }
    return;
  }

  // ═══════════════════════════════════════════════════════════════
  //  PHASE 2 — VEER GUARD
  // ═══════════════════════════════════════════════════════════════

  float mq2 = (float)analogRead(PIN_MQ2);
  float mq4 = (float)analogRead(PIN_MQ4);
  float mq7 = (float)analogRead(PIN_MQ7);

  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();
  if (isnan(temp)) temp = -1.0f;
  if (isnan(hum))  hum  = -1.0f;

  float dist = readDistance();
  updateSimulatedVitals();
  int curHR = simHR, curSp = simSpO2;

  // ── MPU6050 (GY-521 clone) ─────────────────────────────────────
  float ax = 0, ay = 0, az = 0, accelMag = 0;
  bool  fallDetected = false;
  noMotionDanger = false;

  if (mpuOK) {
    int16_t rAx, rAy, rAz, rGx, rGy, rGz;
    mpu.getMotion6(&rAx, &rAy, &rAz, &rGx, &rGy, &rGz);
    ax = (rAx / MPU_SENSITIVITY) * GRAVITY;
    ay = (rAy / MPU_SENSITIVITY) * GRAVITY;
    az = (rAz / MPU_SENSITIVITY) * GRAVITY;
    accelMag = sqrt(ax*ax + ay*ay + az*az);

    if (accelMag >= ACCEL_DANGER) fallDetected = true;

    float delta = fabs(accelMag - prevAccelMag);
    if (delta >= MOTION_DELTA_THRESH) lastMotionAt = millis();
    prevAccelMag = accelMag;

    if ((millis() - lastMotionAt) >= NO_MOTION_MS) noMotionDanger = true;
  }

  // ── Classify ───────────────────────────────────────────────────
  liveStatus = classify(mq2, mq4, mq7, temp, hum, dist,
                        curHR, curSp, accelMag, mpuOK, noMotionDanger);

  // ── Outputs ────────────────────────────────────────────────────
  setLEDs(liveStatus);
  handleBuzzer(liveStatus);

  // ── Serial + OLED ──────────────────────────────────────────────
  serialGuard(mq2, mq4, mq7, temp, hum, dist,
              curHR, curSp, ax, ay, az, accelMag, noMotionDanger, liveStatus);
  oledGuard(mq2, mq4, mq7, temp, hum, dist,
            curHR, curSp, ax, ay, az, accelMag, noMotionDanger, liveStatus);

  // ── Firebase push every 5 seconds ─────────────────────────────
  if (millis() - lastFBPush >= FB_PUSH_INTERVAL) {
    pushGuardData(mq2, mq4, mq7, temp, hum, dist,
                  curSp, false, fallDetected, noMotionDanger, liveStatus);
    lastFBPush = millis();
  }
}

// ═════════════════════════════════════════════════════════════════
//  WIFI
// ═════════════════════════════════════════════════════════════════
void connectWiFi() {
  oledWiFiConnecting();
  Serial.print(F("[WiFi] Connecting to ")); Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 20000) {
    delay(500);
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    String ip = WiFi.localIP().toString();
    Serial.println();
    Serial.print(F("[WiFi] Connected! IP: ")); Serial.println(ip);
    oledWiFiConnected(ip);
    delay(2000);
  } else {
    Serial.println(F("\n[WiFi] FAILED — running offline (no Firebase)"));
    oled.clearDisplay();
    oled.setTextSize(1);
    oled.setCursor(0, 0);  oled.println(F("WiFi FAILED!"));
    oled.setCursor(0, 16); oled.println(F("Running OFFLINE."));
    oled.setCursor(0, 32); oled.println(F("Check credentials."));
    oled.display();
    delay(3000);
  }
}

// ═════════════════════════════════════════════════════════════════
//  FIREBASE INIT
// ═════════════════════════════════════════════════════════════════
void initFirebase() {
  if (WiFi.status() != WL_CONNECTED) return;

  fbConfig.database_url            = FIREBASE_URL;
  fbConfig.signer.tokens.legacy_token = FIREBASE_SECRET;

  // Stream timeout — keep connection alive
  fbdo.setResponseSize(2048);

  Firebase.begin(&fbConfig, &auth);
  Firebase.reconnectWiFi(true);

  // Wait up to 5 seconds for Firebase to be ready
  unsigned long t0 = millis();
  while (!Firebase.ready() && millis() - t0 < 5000) delay(200);

  if (Firebase.ready()) {
    firebaseReady = true;
    Serial.println(F("[Firebase] Connected OK"));
    oledFirebaseOK();
    delay(1500);
  } else {
    Serial.println(F("[Firebase] Connection FAILED — check URL and secret"));
    oled.clearDisplay();
    oled.setTextSize(1);
    oled.setCursor(0,  0); oled.println(F("Firebase FAILED!"));
    oled.setCursor(0, 14); oled.println(F("Check DB URL and"));
    oled.setCursor(0, 26); oled.println(F("Database Secret."));
    oled.display();
    delay(3000);
  }
}

// ═════════════════════════════════════════════════════════════════
//  TIMESTAMP
// ═════════════════════════════════════════════════════════════════
long getEpoch() {
  time_t now;
  time(&now);
  // If NTP failed, fall back to millis-based pseudo timestamp
  return (now > 100000) ? (long)now : (long)(millis() / 1000);
}

// ═════════════════════════════════════════════════════════════════
//  FIREBASE PUSH — VEER PROBE RESULT
//  Written once after 10-reading average, to: telemetry/Worker1/VeerProbe
// ═════════════════════════════════════════════════════════════════
void pushProbeResult(float mq2, float mq4, float mq7,
                     float temp, float hum, float dist,
                     int sp, bool sos, Status s) {
  if (!firebaseReady) {
    Serial.println(F("[Firebase] Skipped probe push — not connected"));
    return;
  }

  FirebaseJson json;
  json.set("H2S",         (int)mq2);    // MQ2 treated as H2S
  json.set("CH4",         (int)mq4);
  json.set("CO",          (int)mq7);
  json.set("temperature", (float)((int)(temp * 10)) / 10.0);  // 1 decimal
  json.set("humidity",    (float)((int)(hum  * 10)) / 10.0);
  json.set("water_depth", (float)((int)(dist * 10)) / 10.0);
  json.set("oxygen",      sp);
  json.set("sos",         sos);
  json.set("status",      sName(s));
  json.set("timestamp",   getEpoch());

  String path = String(WORKER_PATH) + "/VeerProbe";

  if (Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json)) {
    Serial.println(F("[Firebase] VeerProbe data pushed OK"));
  } else {
    Serial.print(F("[Firebase] VeerProbe push FAILED: "));
    Serial.println(fbdo.errorReason());
  }
}

// ═════════════════════════════════════════════════════════════════
//  FIREBASE PUSH — VEER GUARD (every 5 seconds)
//  Written to: telemetry/Worker1/VeerGuard
// ═════════════════════════════════════════════════════════════════
void pushGuardData(float mq2, float mq4, float mq7,
                   float temp, float hum, float dist,
                   int sp, bool sos,
                   bool fall, bool noMov, Status s) {
  if (!firebaseReady) return;

  // Reconnect WiFi if dropped
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("[WiFi] Reconnecting..."));
    WiFi.reconnect();
    unsigned long t0 = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - t0 < 8000) delay(300);
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println(F("[WiFi] Reconnect failed — skipping push"));
      return;
    }
  }

  FirebaseJson json;
  json.set("H2S",           (int)mq2);
  json.set("CH4",           (int)mq4);
  json.set("CO",            (int)mq7);
  json.set("temperature",   (float)((int)(temp * 10)) / 10.0);
  json.set("humidity",      (float)((int)(hum  * 10)) / 10.0);
  json.set("water_depth",   (float)((int)(dist * 10)) / 10.0);
  json.set("oxygen",        sp);
  json.set("sos",           sos);
  json.set("fall_detected", fall);
  json.set("no_movement",   noMov);
  json.set("status",        sName(s));
  json.set("timestamp",     getEpoch());

  String path = String(WORKER_PATH) + "/VeerGuard";

  if (Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json)) {
    Serial.print(F("[Firebase] VeerGuard pushed — status: "));
    Serial.println(sName(s));
  } else {
    Serial.print(F("[Firebase] VeerGuard push FAILED: "));
    Serial.println(fbdo.errorReason());
  }
}

// ═════════════════════════════════════════════════════════════════
//  FIREBASE PUSH — SOS (immediate, highest priority)
// ═════════════════════════════════════════════════════════════════
void pushSOS() {
  if (!firebaseReady) {
    Serial.println(F("[Firebase] SOS push skipped — not connected"));
    return;
  }

  // Write sos=true and status=DANGER to both nodes immediately
  String probePath = String(WORKER_PATH) + "/VeerProbe";
  String guardPath = String(WORKER_PATH) + "/VeerGuard";
  long   ts        = getEpoch();

  Firebase.RTDB.setBool(&fbdo,   (probePath + "/sos").c_str(),    true);
  Firebase.RTDB.setString(&fbdo, (probePath + "/status").c_str(), "DANGER");
  Firebase.RTDB.setInt(&fbdo,    (probePath + "/timestamp").c_str(), ts);

  Firebase.RTDB.setBool(&fbdo,   (guardPath + "/sos").c_str(),    true);
  Firebase.RTDB.setString(&fbdo, (guardPath + "/status").c_str(), "DANGER");
  Firebase.RTDB.setInt(&fbdo,    (guardPath + "/timestamp").c_str(), ts);

  Serial.println(F("[Firebase] SOS pushed to both VeerProbe and VeerGuard"));
}

// ═════════════════════════════════════════════════════════════════
//  SENSOR HELPERS
// ═════════════════════════════════════════════════════════════════
float readDistance() {
  digitalWrite(PIN_TRIG, LOW);  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  long dur = pulseIn(PIN_ECHO, HIGH, 35000UL);
  return (dur == 0) ? 999.0f : dur * 0.034f / 2.0f;
}

// ═════════════════════════════════════════════════════════════════
//  CLASSIFICATION
// ═════════════════════════════════════════════════════════════════
Status classify(float mq2, float mq4, float mq7,
                float temp, float hum, float dist,
                int hr, int sp,
                float accMag, bool useAccel, bool noMotion) {
  Status s = SAFE;
  auto upg = [&](Status n) { if ((int)n > (int)s) s = n; };

  if      (mq2 >= MQ2_DANGER)                             upg(DANGER);
  else if (mq2 >= MQ2_WARN)                               upg(WARNING);
  if      (mq4 >= MQ4_DANGER)                             upg(DANGER);
  else if (mq4 >= MQ4_WARN)                               upg(WARNING);
  if      (mq7 >= MQ7_DANGER)                             upg(DANGER);
  else if (mq7 >= MQ7_WARN)                               upg(WARNING);
  if (temp > 0) {
    if      (temp >= TEMP_DANGER)                          upg(DANGER);
    else if (temp >= TEMP_WARN)                            upg(WARNING);
  }
  if (hum > 0) {
    if      (hum >= HUM_DANGER)                            upg(DANGER);
    else if (hum >= HUM_WARN)                              upg(WARNING);
  }
  if (dist < 990.0f) {
    if      (dist <= DIST_DANGER)                          upg(DANGER);
    else if (dist <= DIST_WARN)                            upg(WARNING);
  }
  if (hr > 0) {
    if      (hr <= HR_LOW_DANGER || hr >= HR_HIGH_DANGER)  upg(DANGER);
    else if (hr <= HR_LOW_WARN   || hr >= HR_HIGH_WARN)    upg(WARNING);
  }
  if (sp > 0) {
    if      (sp <= SPO2_DANGER)                            upg(DANGER);
    else if (sp <= SPO2_WARN)                              upg(WARNING);
  }
  if (useAccel) {
    if      (accMag >= ACCEL_DANGER)                       upg(DANGER);
    else if (accMag >= ACCEL_WARN)                         upg(WARNING);
  }
  if (noMotion)                                            upg(DANGER);

  return s;
}

// ═════════════════════════════════════════════════════════════════
//  OUTPUT HELPERS
// ═════════════════════════════════════════════════════════════════
void setLEDs(Status s) {
  digitalWrite(PIN_LED_GREEN,  s == SAFE    ? HIGH : LOW);
  digitalWrite(PIN_LED_YELLOW, s == WARNING ? HIGH : LOW);
  digitalWrite(PIN_LED_RED,    s == DANGER  ? HIGH : LOW);
}

void handleBuzzer(Status s) {
  unsigned long t = millis();
  if (s == DANGER) {
    if (t - lastBuzz >= 150) { buzzState = !buzzState; digitalWrite(PIN_BUZZER, buzzState); lastBuzz = t; }
  } else if (s == WARNING) {
    if (t - lastBuzz >= 800) { buzzState = !buzzState; digitalWrite(PIN_BUZZER, buzzState); lastBuzz = t; }
  } else {
    digitalWrite(PIN_BUZZER, LOW); buzzState = false;
  }
}

const char* sName(Status s) {
  switch (s) {
    case SAFE:    return "SAFE";
    case WARNING: return "WARNING";
    case DANGER:  return "DANGER";
    default:      return "UNKNOWN";
  }
}

// ═════════════════════════════════════════════════════════════════
//  OLED SCREENS
// ═════════════════════════════════════════════════════════════════
void oledWelcome() {
  oled.clearDisplay(); oled.setTextSize(1);
  oled.setCursor(12, 0);  oled.println(F("** WELCOME TO **"));
  oled.setCursor(0,  12); oled.println(F("  VEER SURAKSHA GRID"));
  oled.setCursor(22, 24); oled.println(F("Safety System"));
  oled.drawLine(0, 34, 127, 34, SSD1306_WHITE);
  oled.setCursor(5,  40); oled.println(F("Manhole Worker IoT"));
  oled.setCursor(20, 52); oled.println(F("Booting up..."));
  oled.display();
}

void oledWiFiConnecting() {
  oled.clearDisplay(); oled.setTextSize(1);
  oled.setCursor(0,  0); oled.println(F("= VEER SURAKSHA GRID ="));
  oled.drawLine(0, 10, 127, 10, SSD1306_WHITE);
  oled.setCursor(0, 16); oled.println(F("Connecting WiFi..."));
  oled.setCursor(0, 28); oled.println(WIFI_SSID);
  oled.setCursor(0, 42); oled.println(F("Please wait..."));
  oled.display();
}

void oledWiFiConnected(String ip) {
  oled.clearDisplay(); oled.setTextSize(1);
  oled.setCursor(0,  0); oled.println(F("= VEER SURAKSHA GRID ="));
  oled.drawLine(0, 10, 127, 10, SSD1306_WHITE);
  oled.setCursor(0, 14); oled.println(F("[OK] WiFi Connected!"));
  oled.setCursor(0, 28); oled.print(F("SSID: ")); oled.println(WIFI_SSID);
  oled.setCursor(0, 40); oled.print(F("IP  : ")); oled.println(ip);
  oled.display();
}

void oledFirebaseOK() {
  oled.clearDisplay(); oled.setTextSize(1);
  oled.setCursor(0,  0); oled.println(F("= VEER SURAKSHA GRID ="));
  oled.drawLine(0, 10, 127, 10, SSD1306_WHITE);
  oled.setCursor(0, 16); oled.println(F("[OK] WiFi Connected"));
  oled.setCursor(0, 30); oled.println(F("[OK] Firebase Ready"));
  oled.setCursor(0, 44); oled.println(F("System online!"));
  oled.display();
}

void oledInitPhase1() {
  oled.clearDisplay(); oled.setTextSize(1);
  oled.setCursor(0,  0); oled.println(F("= VEER SURAKSHA GRID ="));
  oled.drawLine(0, 10, 127, 10, SSD1306_WHITE);
  oled.setCursor(0, 14); oled.println(F("PHASE 1 : VEER PROBE"));
  oled.setCursor(0, 26); oled.println(F("Pre-Inspection Mode"));
  oled.setCursor(0, 38); oled.println(F("Taking 10 readings..."));
  oled.setCursor(0, 50); oled.println(F("DO NOT ENTER YET"));
  oled.display();
}

void oledProbeReading(int n, float mq2, float mq4, float mq7,
                      float temp, float hum, float dist, int hr, int sp) {
  oled.clearDisplay(); oled.setTextSize(1); oled.setCursor(0, 0);
  oled.print(F("VEER PROBE [")); oled.print(n);
  oled.print(F("/")); oled.print(PROBE_READINGS); oled.println(F("]"));
  oled.drawLine(0, 10, 127, 10, SSD1306_WHITE);
  oled.setCursor(0, 13);
  oled.print(F("H2S:")); oled.print((int)mq2);
  oled.print(F(" CH4:")); oled.println((int)mq4);
  oled.print(F("CO:")); oled.println((int)mq7);
  oled.print(F("T:")); oled.print(temp, 1);
  oled.print(F("C H:")); oled.print(hum, 1); oled.println(F("%"));
  oled.print(F("Dist:")); oled.print(dist, 1); oled.println(F("cm"));
  oled.print(F("O2:")); oled.print(sp); oled.println(F("%(sim)"));
  oled.display();
}

void oledProbeAvg() {
  oled.clearDisplay(); oled.setTextSize(1);
  oled.setCursor(0, 0); oled.println(F("= PROBE AVERAGES (10) ="));
  oled.drawLine(0, 10, 127, 10, SSD1306_WHITE);
  oled.setCursor(0, 13);
  oled.print(F("H2S:")); oled.print(avgMQ2, 0);
  oled.print(F(" CH4:")); oled.println(avgMQ4, 0);
  oled.print(F("CO:")); oled.println(avgMQ7, 0);
  oled.print(F("Temp:")); oled.print(avgTemp, 1); oled.println(F("C"));
  oled.print(F("Hum: ")); oled.print(avgHum, 1);  oled.println(F("%"));
  oled.print(F("Dist:")); oled.print(avgDist, 1); oled.println(F("cm"));
  oled.print(F("O2:")); oled.print(avgSpO2, 0); oled.println(F("%(sim)"));
  oled.display();
}

void oledProbeResult(Status s) {
  oled.clearDisplay(); oled.setTextSize(1);
  oled.setCursor(0, 0); oled.println(F("== VEER PROBE RESULT =="));
  oled.drawLine(0, 10, 127, 10, SSD1306_WHITE);
  oled.setTextSize(2); oled.setCursor(0, 16);
  if (s == SAFE) {
    oled.println(F(">> SAFE <<"));
    oled.setTextSize(1);
    oled.setCursor(0, 40); oled.println(F("ENTRY ALLOWED"));
    oled.setCursor(0, 52); oled.println(F("Phase 2 starting..."));
  } else if (s == WARNING) {
    oled.println(F(">WARNING<"));
    oled.setTextSize(1);
    oled.setCursor(0, 40); oled.println(F("PROCEED WITH CARE"));
    oled.setCursor(0, 52); oled.println(F("Phase 2 starting..."));
  } else {
    oled.println(F("!DANGER!"));
    oled.setTextSize(1);
    oled.setCursor(0, 40); oled.println(F("DO NOT ENTER!!"));
    oled.setCursor(0, 52); oled.println(F("HAZARD DETECTED!"));
  }
  oled.display();
}

void oledPhase2Start() {
  oled.clearDisplay(); oled.setTextSize(1);
  oled.setCursor(0,  0); oled.println(F("= VEER SURAKSHA GRID ="));
  oled.drawLine(0, 10, 127, 10, SSD1306_WHITE);
  oled.setCursor(0, 16); oled.println(F("PHASE 2:"));
  oled.setCursor(0, 28); oled.println(F("  VEER GUARD ACTIVE"));
  oled.setCursor(0, 42); oled.println(F("Firebase: LIVE"));
  oled.setCursor(0, 54); oled.println(F("Worker may enter now."));
  oled.display();
}

void oledGuard(float mq2, float mq4, float mq7,
               float temp, float hum, float dist,
               int hr, int sp,
               float ax, float ay, float az, float mag,
               bool noMotion, Status s) {
  unsigned long t = millis();
  if (t - lastPage > 3000) { oledPage = (oledPage + 1) % 4; lastPage = t; }

  oled.clearDisplay(); oled.setTextSize(1);
  if      (s == DANGER)  oled.print(F("[!!! DANGER !!!]"));
  else if (s == WARNING) oled.print(F("[  * WARNING * ]"));
  else                   oled.print(F("[    * SAFE *  ]"));
  oled.println();
  oled.drawLine(0, 10, 127, 10, SSD1306_WHITE);
  oled.setCursor(0, 13);

  if (oledPage == 0) {
    // Gas sensors
    oled.println(F("-- Gas Sensors --"));
    oled.print(F("H2S (MQ2) : ")); oled.println((int)mq2);
    oled.print(F("CH4 (MQ4) : ")); oled.println((int)mq4);
    oled.print(F("CO  (MQ7) : ")); oled.println((int)mq7);

  } else if (oledPage == 1) {
    // Environment
    oled.println(F("-- Environment --"));
    oled.print(F("Temp : ")); oled.print(temp, 1); oled.println(F(" C"));
    oled.print(F("Hum  : ")); oled.print(hum,  1); oled.println(F(" %"));
    oled.print(F("Water: "));
    if (dist < 990.0f) { oled.print(dist, 1); oled.println(F(" cm")); }
    else                  oled.println(F("Clear"));
    oled.print(F("O2   : ")); oled.print(sp); oled.println(F("% (sim)"));

  } else if (oledPage == 2) {
    // Motion / MPU
    oled.println(F("-- Motion / GY-521 --"));
    if (mpuOK) {
      oled.print(F("X:")); oled.print(ax, 1);
      oled.print(F(" Y:")); oled.print(ay, 1);
      oled.print(F(" Z:")); oled.println(az, 1);
      oled.print(F("Mag:")); oled.print(mag, 2);
      if      (mag >= ACCEL_DANGER) oled.println(F(" FALL!"));
      else if (mag >= ACCEL_WARN)   oled.println(F(" JOLT"));
      else                          oled.println(F(" OK"));
      if (noMotion) oled.println(F("!! NO MOTION 15s !!"));
      else {
        unsigned long still = (millis() - lastMotionAt) / 1000;
        oled.print(F("Still: ")); oled.print(still); oled.println(F("s"));
      }
    } else { oled.println(F("GY-521 offline")); }

  } else {
    // Firebase status
    oled.println(F("-- Firebase Status --"));
    oled.print(F("WiFi : "));
    oled.println(WiFi.status() == WL_CONNECTED ? F("Connected") : F("OFFLINE"));
    oled.print(F("DB   : "));
    oled.println(firebaseReady ? F("LIVE") : F("OFFLINE"));
    oled.print(F("Push : every 5s"));
    unsigned long nextPush = (FB_PUSH_INTERVAL - (millis() - lastFBPush)) / 1000;
    oled.print(F("  Next:")); oled.print(nextPush); oled.println(F("s"));
  }
  oled.display();
}

// ═════════════════════════════════════════════════════════════════
//  SERIAL OUTPUT
// ═════════════════════════════════════════════════════════════════
void serialProbeReading(int n, float mq2, float mq4, float mq7,
                        float temp, float hum, float dist, int hr, int sp) {
  Serial.print(F("[VEER PROBE ")); Serial.print(n); Serial.print(F("/10]  "));
  Serial.print(F("H2S=")); Serial.print((int)mq2);
  Serial.print(F("  CH4=")); Serial.print((int)mq4);
  Serial.print(F("  CO=")); Serial.print((int)mq7);
  Serial.print(F("  Temp=")); Serial.print(temp, 1); Serial.print(F("C"));
  Serial.print(F("  Hum=")); Serial.print(hum, 1); Serial.print(F("%"));
  Serial.print(F("  Dist=")); Serial.print(dist, 1); Serial.print(F("cm"));
  Serial.print(F("  O2=")); Serial.print(sp); Serial.println(F("%(sim)"));
}

void serialProbeAvg(Status s) {
  Serial.println(F("\n┌──────────────────────────────────────────┐"));
  Serial.println(F("│        VEER PROBE — FINAL AVERAGES        │"));
  Serial.println(F("├──────────────────────────────────────────┤"));
  Serial.print(F("│  H2S  (MQ2)           : ")); Serial.println(avgMQ2, 1);
  Serial.print(F("│  CH4  (MQ4)           : ")); Serial.println(avgMQ4, 1);
  Serial.print(F("│  CO   (MQ7)           : ")); Serial.println(avgMQ7, 1);
  Serial.print(F("│  Temperature          : ")); Serial.print(avgTemp, 1); Serial.println(F(" C"));
  Serial.print(F("│  Humidity             : ")); Serial.print(avgHum,  1); Serial.println(F(" %"));
  Serial.print(F("│  Water Depth          : ")); Serial.print(avgDist, 1); Serial.println(F(" cm"));
  Serial.print(F("│  Oxygen / SpO2 (sim)  : ")); Serial.print(avgSpO2, 0); Serial.println(F(" %"));
  Serial.println(F("├──────────────────────────────────────────┤"));
  Serial.print(F("│  >> INITIAL STATUS    : ")); Serial.println(sName(s));
  if      (s == DANGER)  Serial.println(F("│  !! WORKER MUST NOT ENTER THE MANHOLE !! │"));
  else if (s == WARNING) Serial.println(F("│     ENTER WITH EXTREME CAUTION            │"));
  else                   Serial.println(F("│     SAFE TO ENTER — Veer Guard starting   │"));
  Serial.println(F("└──────────────────────────────────────────┘\n"));
}

void serialGuard(float mq2, float mq4, float mq7,
                 float temp, float hum, float dist,
                 int hr, int sp,
                 float ax, float ay, float az, float mag,
                 bool noMotion, Status s) {
  Serial.println(F("┌──────────── VEER GUARD — LIVE ─────────────┐"));
  Serial.print(F("│  H2S  (MQ2)           : ")); Serial.println((int)mq2);
  Serial.print(F("│  CH4  (MQ4)           : ")); Serial.println((int)mq4);
  Serial.print(F("│  CO   (MQ7)           : ")); Serial.println((int)mq7);
  Serial.print(F("│  Temperature          : ")); Serial.print(temp, 1); Serial.println(F(" C"));
  Serial.print(F("│  Humidity             : ")); Serial.print(hum,  1); Serial.println(F(" %"));
  Serial.print(F("│  Water Depth          : ")); Serial.print(dist, 1); Serial.println(F(" cm"));
  Serial.print(F("│  Oxygen / SpO2 (sim)  : ")); Serial.print(sp);      Serial.println(F(" %"));
  if (mpuOK) {
    Serial.print(F("│  Accel X / Y / Z      : "));
    Serial.print(ax,2); Serial.print(F(" / "));
    Serial.print(ay,2); Serial.print(F(" / "));
    Serial.print(az,2); Serial.println(F(" m/s²"));
    Serial.print(F("│  Accel Magnitude      : ")); Serial.print(mag,2); Serial.println(F(" m/s²"));
    if (mag >= ACCEL_DANGER) Serial.println(F("│  !! FALL DETECTED !!"));
    if (noMotion)            Serial.println(F("│  !! NO MOTION FOR 15 SECONDS !!"));
    else {
      Serial.print(F("│  Still for            : "));
      Serial.print((millis() - lastMotionAt) / 1000); Serial.println(F(" s"));
    }
  } else {
    Serial.println(F("│  GY-521               : offline"));
  }
  Serial.print(F("│  WiFi                 : "));
  Serial.println(WiFi.status() == WL_CONNECTED ? F("Connected") : F("OFFLINE"));
  Serial.print(F("│  Firebase             : "));
  Serial.println(firebaseReady ? F("LIVE") : F("OFFLINE"));
  Serial.print(F("│  >> STATUS            : ")); Serial.println(sName(s));
  Serial.println(F("└────────────────────────────────────────────┘"));
}
