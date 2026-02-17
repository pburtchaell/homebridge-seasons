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

  let PlatformClass = null;

  return {
    hap: { Service: MockService, Characteristic: MockCharacteristic },
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

function createAccessory(config = {}) {
  const defaults = {
    name: "Seasons",
    platform: "Seasons",
    calendar: "meteorologic",
    hemisphere: "north",
    display: "both",
  };
  const log = Object.assign(() => {}, { debug() {} });
  const platform = new mock.PlatformClass(log, { ...defaults, ...config });
  let accessory;
  platform.accessories((accs) => {
    accessory = accs[0];
  });
  return accessory;
}

function date(month, day) {
  return new Date(2025, month - 1, day);
}

// --- Tests ---

describe("Meteorologic seasons", () => {
  const accessory = createAccessory({ calendar: "meteorologic" });

  const cases = [
    [1, "Winter"],
    [2, "Winter"],
    [3, "Spring"],
    [4, "Spring"],
    [5, "Spring"],
    [6, "Summer"],
    [7, "Summer"],
    [8, "Summer"],
    [9, "Autumn"],
    [10, "Autumn"],
    [11, "Autumn"],
    [12, "Winter"],
  ];

  for (const [month, expected] of cases) {
    it(`month ${month} → ${expected}`, () => {
      expect(accessory.getMeteorologicSeason(date(month, 15))).toBe(expected);
    });
  }
});

describe("Astronomic seasons (northern hemisphere)", () => {
  const accessory = createAccessory({
    calendar: "astronomic",
    hemisphere: "north",
  });

  const cases = [
    // Spring equinox boundary (Mar 20)
    [3, 19, "Winter"],
    [3, 20, "Spring"],
    [3, 21, "Spring"],
    // Summer solstice boundary (Jun 21)
    [6, 20, "Spring"],
    [6, 21, "Summer"],
    [6, 22, "Summer"],
    // Autumn equinox boundary (Sep 22)
    [9, 21, "Summer"],
    [9, 22, "Autumn"],
    [9, 23, "Autumn"],
    // Winter solstice boundary (Dec 21)
    [12, 20, "Autumn"],
    [12, 21, "Winter"],
    [12, 22, "Winter"],
    // Mid-season checks
    [1, 15, "Winter"],
    [4, 15, "Spring"],
    [7, 15, "Summer"],
    [10, 15, "Autumn"],
  ];

  for (const [month, day, expected] of cases) {
    it(`${month}/${day} → ${expected}`, () => {
      expect(accessory.getAstronomicSeason(date(month, day), true)).toBe(
        expected
      );
    });
  }
});

describe("Astronomic seasons (southern hemisphere)", () => {
  const accessory = createAccessory({
    calendar: "astronomic",
    hemisphere: "south",
  });

  const cases = [
    // Hemisphere inversion: north season → opposite in south
    [1, 15, "Summer"],
    [4, 15, "Autumn"],
    [7, 15, "Winter"],
    [10, 15, "Spring"],
    // Boundaries also flip
    [3, 19, "Summer"],
    [3, 20, "Autumn"],
    [6, 21, "Winter"],
    [9, 22, "Spring"],
    [12, 21, "Summer"],
  ];

  for (const [month, day, expected] of cases) {
    it(`${month}/${day} → ${expected}`, () => {
      expect(accessory.getAstronomicSeason(date(month, day), false)).toBe(
        expected
      );
    });
  }
});

describe("Config integration", () => {
  it("applies default config values", () => {
    const accessory = createAccessory({});
    expect(accessory.calendar).toBe("meteorologic");
    expect(accessory.hemisphere).toBe("north");
    expect(accessory.display).toBe("both");
  });

  it("getCurrentSeason returns number matching season name", () => {
    return new Promise((resolve) => {
      const accessory = createAccessory({ calendar: "meteorologic" });
      accessory.getCurrentSeasonName((err, name) => {
        accessory.getCurrentSeason((err2, number) => {
          const seasonNumbers = { Spring: 0, Summer: 1, Autumn: 2, Winter: 3 };
          expect(number).toBe(seasonNumbers[name]);
          resolve();
        });
      });
    });
  });
});

describe("Display mode wiring", () => {
  it("'both' registers number and name characteristics", () => {
    const accessory = createAccessory({ display: "both" });
    expect(accessory.seasonService._characteristics.size).toBe(2);

    // Both should have get handlers
    for (const [, char] of accessory.seasonService._characteristics) {
      expect(typeof char._handlers.get).toBe("function");
    }
  });

  it("'number' registers only the numeric characteristic", () => {
    const accessory = createAccessory({ display: "number" });
    expect(accessory.seasonService._characteristics.size).toBe(1);

    const [, char] = [...accessory.seasonService._characteristics][0];
    expect(char.UUID).toBe("9382ccde-6cab-42e7-877a-2df98b8d0b66");
    expect(typeof char._handlers.get).toBe("function");
  });

  it("'name' registers only the name characteristic", () => {
    const accessory = createAccessory({ display: "name" });
    expect(accessory.seasonService._characteristics.size).toBe(1);

    const [, char] = [...accessory.seasonService._characteristics][0];
    expect(char.UUID).toBe("02e4c0e3-44f9-44b8-8667-98f54b376ce4");
    expect(typeof char._handlers.get).toBe("function");
  });
});
