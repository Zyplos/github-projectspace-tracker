import util from "util";

export function logFull(data: any) {
  console.log(util.inspect(data, { showHidden: false, depth: null, colors: true }));
}
