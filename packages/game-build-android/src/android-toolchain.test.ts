import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  parseJavaMajor,
  selectJdkHome,
  gradleJavaEnv,
} from "./android-toolchain.js";

describe("parseJavaMajor", () => {
  it("parses modern OpenJDK versions", () => {
    expect(parseJavaMajor('openjdk version "21.0.2" 2024-01-16')).toBe(21);
    expect(parseJavaMajor('java version "23.0.1" 2024-10-15')).toBe(23);
  });

  it("parses Java 8", () => {
    expect(parseJavaMajor('java version "1.8.0_392"')).toBe(8);
  });
});

describe("selectJdkHome", () => {
  const jdk17 = { home: "C:\\Java\\jdk-17", major: 17 };
  const jdk21 = { home: "C:\\Java\\jdk-21", major: 21 };
  const jdk23 = { home: "C:\\Java\\jdk-23", major: 23 };

  it("returns undefined when nothing meets the required major", () => {
    expect(selectJdkHome([jdk17], 21, jdk17.home)).toBeUndefined();
  });

  it("prefers JAVA_HOME when it already meets the requirement", () => {
    expect(selectJdkHome([jdk21, jdk23], 21, jdk21.home)).toEqual(jdk21);
  });

  it("ignores an older JAVA_HOME and picks the newest qualifying JDK", () => {
    expect(selectJdkHome([jdk17, jdk23], 21, jdk17.home)).toEqual(jdk23);
  });
});

describe("gradleJavaEnv", () => {
  it("prepends the selected JDK bin to PATH and sets JAVA_HOME", () => {
    const env = gradleJavaEnv(
      { found: true, majorVersion: 23, javaHome: "C:\\Java\\jdk-23" },
      { PATH: "C:\\Windows\\System32", JAVA_HOME: "C:\\Java\\jdk-17" },
    );
    expect(env.JAVA_HOME).toBe("C:\\Java\\jdk-23");
    expect(env.PATH?.startsWith(`C:\\Java\\jdk-23${path.sep}bin`)).toBe(true);
  });
});
