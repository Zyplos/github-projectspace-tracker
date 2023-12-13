import util from "util";

export function logFull(data: any) {
  console.log(util.inspect(data, { showHidden: false, depth: null, colors: true }));
}

// https://stackoverflow.com/a/3261380
export function isStringBlank(str: string) {
  return !str || /^\s*$/.test(str);
}
