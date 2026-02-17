// --- Mock Homebridge HAP API ---

function createHomebridgeMock() {
  class MockCharacteristic {
    constructor(name, uuid) {
      this.displayName = name;
      this.UUID = uuid;
      this.value = null;
      this._props = {};
      this._handlers = {};
    }
    setProps(props) {
      this._props = props;
      return this;
    }
    getDefaultValue() {
      return null;
    }
    on(event, handler) {
      this._handlers[event] = handler;
      return this;
    }
  }

  MockCharacteristic.Formats = { UINT8: "uint8", STRING: "string" };
  MockCharacteristic.Perms = { READ: "pr", NOTIFY: "ev" };
  MockCharacteristic.Manufacturer = "manufacturer";
  MockCharacteristic.Model = "model";
  MockCharacteristic.SerialNumber = "serialnumber";
  MockCharacteristic.FirmwareRevision = "firmwarerevision";
  MockCharacteristic.ContactSensorState = {
    CONTACT_DETECTED: 0,
    CONTACT_NOT_DETECTED: 1,
  };

  class MockService {
    constructor(displayName, uuid, subtype) {
      this.displayName = displayName;
      this.UUID = uuid;
      this.subtype = subtype;
      this._characteristics = new Map();
    }
    addCharacteristic(CharClass) {
      const inst = new CharClass();
      this._characteristics.set(CharClass, inst);
      return inst;
    }
    getCharacteristic(key) {
      if (this._characteristics.has(key)) {
        return this._characteristics.get(key);
      }
      // For ContactSensorState, return a new mock characteristic
      if (key === MockCharacteristic.ContactSensorState) {
        const char = new MockCharacteristic("Contact Sensor State", "0000006A-0000-1000-8000-0026BB765291");
        this._characteristics.set(key, char);
        return char;
      }
      return this;
    }
    setCharacteristic() {
      return this;
    }
  }

  MockService.AccessoryInformation = class extends MockService {
    constructor() {
      super("Accessory Information", "0000003E-0000-1000-8000-0026BB765291");
    }
  };

  MockService.ContactSensor = class extends MockService {
    constructor(displayName) {
      super(displayName, "00000080-0000-1000-8000-0026BB765291");
    }
  };

  let PlatformClass = null;

  return {
    hap: {
      Service: MockService,
      Characteristic: MockCharacteristic,
      Formats: { UINT8: "uint8", STRING: "string" },
      Perms: { READ: "pr", NOTIFY: "ev" },
    },
    registerPlatform(id, name, cls) {
      PlatformClass = cls;
    },
    get PlatformClass() {
      return PlatformClass;
    },
  };
}

// --- Setup ---

const mock = createHomebridgeMock();
require("../index")(mock);

function createAccessories(config = {}) {
  const defaults = {
    platform: "Homebridge Seasons",
    hemisphere: "north",
  };
  const log = Object.assign(() => {}, { debug() {} });
  const platform = new mock.PlatformClass(log, { ...defaults, ...config });
  let accessories;
  platform.accessories((accs) => {
    accessories = accs;
  });
  return accessories;
}

function getAccessory(config, seasonName) {
  const accessories = createAccessories(config);
  return accessories.find(a => a.seasonName === seasonName);
}

function date(month, day) {
  return new Date(2025, month - 1, day);
}

// --- Tests ---

describe("Platform", () => {
  it("creates exactly 4 accessories", () => {
    const accessories = createAccessories();
    expect(accessories).toHaveLength(4);
  });

  it("creates one accessory per season", () => {
    const accessories = createAccessories();
    const names = accessories.map(a => a.seasonName);
    expect(names).toEqual(["Spring", "Summer", "Fall", "Winter"]);
  });

  it("each accessory has a ContactSensor service", () => {
    const accessories = createAccessories();
    for (const accessory of accessories) {
      const services = accessory.getServices();
      const contactSensor = services.find(
        s => s instanceof mock.hap.Service.ContactSensor,
      );
      expect(contactSensor).toBeDefined();
    }
  });
});

describe("Contact sensor state", () => {
  it("current season returns CONTACT_NOT_DETECTED, others return CONTACT_DETECTED", () => {
    const accessories = createAccessories();
    // Determine the current meteorologic season
    const month = new Date().getMonth() + 1;
    let currentSeason;
    if (month >= 3 && month <= 5) {
      currentSeason = "Spring";
    } else if (month >= 6 && month <= 8) {
      currentSeason = "Summer";
    } else if (month >= 9 && month <= 11) {
      currentSeason = "Fall";
    } else {
      currentSeason = "Winter";
    }

    return Promise.all(accessories.map(accessory => {
      return new Promise((resolve) => {
        accessory.getContactState((err, state) => {
          if (accessory.seasonName === currentSeason) {
            expect(state).toBe(1); // CONTACT_NOT_DETECTED
          } else {
            expect(state).toBe(0); // CONTACT_DETECTED
          }
          resolve();
        });
      });
    }));
  });
});

describe("Meteorologic seasons", () => {
  const accessory = getAccessory({}, "Spring");

  const cases = [
    [1, "Winter"],
    [2, "Winter"],
    [3, "Spring"],
    [4, "Spring"],
    [5, "Spring"],
    [6, "Summer"],
    [7, "Summer"],
    [8, "Summer"],
    [9, "Fall"],
    [10, "Fall"],
    [11, "Fall"],
    [12, "Winter"],
  ];

  for (const [month, expected] of cases) {
    it(`month ${month} → ${expected}`, () => {
      expect(accessory.getMeteorologicSeason(date(month, 15))).toBe(expected);
    });
  }
});

describe("Astronomic seasons (northern hemisphere)", () => {
  const accessory = getAccessory({
    useAstronomicCalendar: true,
    hemisphere: "north",
  }, "Spring");

  const cases = [
    // Spring equinox boundary (Mar 20)
    [3, 19, "Winter"],
    [3, 20, "Spring"],
    [3, 21, "Spring"],
    // Summer solstice boundary (Jun 21)
    [6, 20, "Spring"],
    [6, 21, "Summer"],
    [6, 22, "Summer"],
    // Fall equinox boundary (Sep 22)
    [9, 21, "Summer"],
    [9, 22, "Fall"],
    [9, 23, "Fall"],
    // Winter solstice boundary (Dec 21)
    [12, 20, "Fall"],
    [12, 21, "Winter"],
    [12, 22, "Winter"],
    // Mid-season checks
    [1, 15, "Winter"],
    [4, 15, "Spring"],
    [7, 15, "Summer"],
    [10, 15, "Fall"],
  ];

  for (const [month, day, expected] of cases) {
    it(`${month}/${day} → ${expected}`, () => {
      expect(accessory.getAstronomicSeason(date(month, day), true)).toBe(
        expected,
      );
    });
  }
});

describe("Astronomic seasons (southern hemisphere)", () => {
  const accessory = getAccessory({
    useAstronomicCalendar: true,
    hemisphere: "south",
  }, "Spring");

  const cases = [
    // Hemisphere inversion: north season → opposite in south
    [1, 15, "Summer"],
    [4, 15, "Fall"],
    [7, 15, "Winter"],
    [10, 15, "Spring"],
    // Boundaries also flip
    [3, 19, "Summer"],
    [3, 20, "Fall"],
    [6, 21, "Winter"],
    [9, 22, "Spring"],
    [12, 21, "Summer"],
  ];

  for (const [month, day, expected] of cases) {
    it(`${month}/${day} → ${expected}`, () => {
      expect(accessory.getAstronomicSeason(date(month, day), false)).toBe(
        expected,
      );
    });
  }
});

describe("Config integration", () => {
  it("applies default config values", () => {
    const accessory = getAccessory({}, "Spring");
    expect(accessory.hemisphere).toBe("north");
  });

  it("uses meteorologic calendar by default", () => {
    const accessory = getAccessory({}, "Spring");
    expect(accessory.config.useAstronomicCalendar).toBeFalsy();
  });

  it("uses astronomic calendar when configured", () => {
    const accessory = getAccessory({ useAstronomicCalendar: true }, "Spring");
    expect(accessory.config.useAstronomicCalendar).toBe(true);
  });
});
