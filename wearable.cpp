#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <DHTesp.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1

#define MQ2_PIN 34
#define OXYGEN_PIN 35
#define DHT_PIN 13
#define SOS_PIN 18

#define BUZZER_PIN 19
#define RED_LED 21
#define YELLOW_LED 22
#define GREEN_LED 23

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
DHTesp dhtSensor;

float gasPercent = 0.0;
float oxygenPercent = 0.0;
float temperature = 0.0;
float humidity = 0.0;
bool sosPressed = false;
String statusText = "SAFE";

void setup() {
  Serial.begin(115200);

  pinMode(SOS_PIN, INPUT_PULLUP);
  pinMode(GREEN_LED, OUTPUT);
  pinMode(YELLOW_LED, OUTPUT);
  pinMode(RED_LED, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  Wire.begin(4, 15);
  dhtSensor.setup(DHT_PIN, DHTesp::DHT22);

  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("OLED failed");
    while (true);
  }

  display.clearDisplay();
  display.display();
  Serial.println("VeerGuard with MQ2 started");
}

void loop() {
  int gasRaw = analogRead(MQ2_PIN);
  int oxygenRaw = analogRead(OXYGEN_PIN);

  TempAndHumidity data = dhtSensor.getTempAndHumidity();
  temperature = data.temperature;
  humidity = data.humidity;

  gasPercent = map(gasRaw, 0, 4095, 0, 100);
  oxygenPercent = 10.0 + ((float)oxygenRaw / 4095.0) * 11.0;
  sosPressed = (digitalRead(SOS_PIN) == LOW);

  bool gasDanger = gasPercent > 60;
  bool gasWarning = gasPercent > 30 && gasPercent <= 60;

  bool oxygenDanger = oxygenPercent < 17.0;
  bool oxygenWarning = oxygenPercent >= 17.0 && oxygenPercent < 19.5;

  bool tempDanger = temperature > 45;
  bool tempWarning = temperature > 35 && temperature <= 45;

  bool humidityDanger = humidity > 85;
  bool humidityWarning = humidity > 70 && humidity <= 85;

  if (sosPressed) {
    statusText = "EMERGENCY";
  } else if (gasDanger || oxygenDanger || tempDanger || humidityDanger) {
    statusText = "DANGER";
  } else if (gasWarning || oxygenWarning || tempWarning || humidityWarning) {
    statusText = "WARNING";
  } else {
    statusText = "SAFE";
  }

  digitalWrite(GREEN_LED, LOW);
  digitalWrite(YELLOW_LED, LOW);
  digitalWrite(RED_LED, LOW);
  digitalWrite(BUZZER_PIN, LOW);

  if (statusText == "SAFE") {
    digitalWrite(GREEN_LED, HIGH);
  } else if (statusText == "WARNING") {
    digitalWrite(YELLOW_LED, HIGH);
  } else if (statusText == "DANGER") {
    digitalWrite(RED_LED, HIGH);
    digitalWrite(BUZZER_PIN, HIGH);
  } else if (statusText == "EMERGENCY") {
    digitalWrite(YELLOW_LED, HIGH);
    digitalWrite(RED_LED, HIGH);
    digitalWrite(BUZZER_PIN, HIGH);
  }

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  display.setCursor(0, 0);
  display.println("VEERGUARD");

  display.setCursor(0, 10);
  display.print("Gas: ");
  display.print(gasPercent, 1);
  display.println("%");

  display.setCursor(0, 20);
  display.print("O2 : ");
  display.print(oxygenPercent, 1);
  display.println("%");

  display.setCursor(0, 30);
  display.print("Tmp: ");
  display.print(temperature, 1);
  display.println(" C");

  display.setCursor(0, 40);
  display.print("Hum: ");
  display.print(humidity, 1);
  display.println("%");

  display.setCursor(0, 50);
  display.print("SOS:");
  display.print(sosPressed ? "Y " : "N ");
  display.print("St:");
  display.println(statusText);

  display.display();

  Serial.print("GasRaw=");
  Serial.print(gasRaw);
  Serial.print(" | Gas=");
  Serial.print(gasPercent, 1);
  Serial.print("% | O2=");
  Serial.print(oxygenPercent, 1);
  Serial.print("% | Temp=");
  Serial.print(temperature, 1);
  Serial.print("C | Hum=");
  Serial.print(humidity, 1);
  Serial.print("% | SOS=");
  Serial.print(sosPressed ? "YES" : "NO");
  Serial.print(" | Status=");
  Serial.println(statusText);

  delay(500);
}
