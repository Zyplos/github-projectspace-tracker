import config from "./config";

export function getPercentageOfTimelineElapsed() {
  const startDate = config.timelineStartDate;
  const endDate = config.timelineEndDate;
  const currentDate = new Date();

  // get percentage of time elapsed between start and end dates
  const timeElapsed = currentDate.getTime() - startDate.getTime();
  const totalTime = endDate.getTime() - startDate.getTime();
  const rawPercent = (timeElapsed / totalTime) * 100;

  // round to 1 decimal place
  let percent = Math.round(rawPercent * 10) / 10;

  if (percent > 100) {
    percent = 100;
  }

  if (percent < 0) {
    percent = 0;
  }

  return percent;
}

export function getCurrentSegmentIndex(timelinePercentage: number) {
  // get the tens place of the percent
  return Math.floor(timelinePercentage / 10);
}

export function getCurrentSegmentPartIndex(timelinePercentage: number) {
  // get the ones place of the percent
  const onethsPlace = timelinePercentage % 10;

  // round to 1 decimal place
  let segmentPercentage = Math.round(onethsPlace * 10) / 10;

  if (segmentPercentage < 3.33) {
    return 1;
  } else if (segmentPercentage < 6.67) {
    return 2;
  } else {
    return 3;
  }
}
