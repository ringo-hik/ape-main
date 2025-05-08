/**
 * expect-webdriverio 타입 선언
 */

declare namespace ExpectWebdriverIO {
  interface Matchers<R> {
    toBeDisplayed(): R;
    toExist(): R;
    toHaveText(text: string): R;
    toHaveValue(value: string): R;
    toBeDefined(): R;
    toBe(value: any): R;
    toBeGreaterThan(value: number): R;
    toEqual(value: any): R;
  }
}

interface Expect {
  (value: any): ExpectWebdriverIO.Matchers<void>;
}

declare module '@wdio/globals' {
  export const expect: Expect;
}