import fs from "node:fs";
import path from "node:path";

const showsPath = path.resolve("src/_data/shows.json");

function fail(message) {
  console.error(`shows validation failed: ${message}`);
  process.exit(1);
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertNonEmptyString(item, key, index) {
  if (typeof item[key] !== "string" || item[key].trim() === "") {
    fail(`item ${index} is missing required non-empty string field \"${key}\"`);
  }
}

function assertOptionalString(item, key, index) {
  if (
    key in item &&
    (typeof item[key] !== "string" || item[key].trim() === "")
  ) {
    fail(
      `item ${index} has optional field \"${key}\" but it is not a non-empty string`,
    );
  }
}

let raw;
try {
  raw = fs.readFileSync(showsPath, "utf8");
} catch (error) {
  fail(`could not read ${showsPath}: ${error.message}`);
}

let shows;
try {
  shows = JSON.parse(raw);
} catch (error) {
  fail(`invalid JSON in ${showsPath}: ${error.message}`);
}

if (!Array.isArray(shows)) {
  fail("shows.json must be an array");
}

if (shows.length === 0) {
  fail("shows.json must contain at least one show");
}

const requiredStringFields = [
  "slug",
  "metaTitle",
  "metaDescription",
  "metaImage",
  "title",
  "dateString",
  "timezone",
  "startTime",
  "location",
  "conName",
  "conShortName",
  "description",
];

const optionalStringFields = [
  "endTime",
  "posterImage",
  "posterAlt",
  "scheduleIntro",
  "scheduleLink",
  "scheduleButtonText",
];

const seenSlugs = new Set();

shows.forEach((item, index) => {
  if (!isPlainObject(item)) {
    fail(`item ${index} must be an object`);
  }

  for (const field of requiredStringFields) {
    assertNonEmptyString(item, field, index);
  }

  for (const field of optionalStringFields) {
    assertOptionalString(item, field, index);
  }

  const slug = item.slug.trim();
  if (seenSlugs.has(slug)) {
    fail(`duplicate value for \"slug\": ${slug}`);
  }
  seenSlugs.add(slug);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(item.dateString)) {
    fail(`item ${index} field \"dateString\" must match YYYY-MM-DD`);
  }

  const [year, month, day] = item.dateString
    .split("-")
    .map((part) => Number.parseInt(part, 10));
  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    fail(`item ${index} field \"dateString\" must be a valid calendar date`);
  }

  const hasScheduleLink = "scheduleLink" in item;
  const hasScheduleButtonText = "scheduleButtonText" in item;
  if (hasScheduleLink !== hasScheduleButtonText) {
    fail(
      `item ${index} must provide both \"scheduleLink\" and \"scheduleButtonText\" together when either is present`,
    );
  }

  if ("posterCredit" in item) {
    if (!isPlainObject(item.posterCredit)) {
      fail(`item ${index} field \"posterCredit\" must be an object`);
    }
    if (
      typeof item.posterCredit.text !== "string" ||
      item.posterCredit.text.trim() === "" ||
      typeof item.posterCredit.url !== "string" ||
      item.posterCredit.url.trim() === ""
    ) {
      fail(
        `item ${index} field \"posterCredit\" must include non-empty string fields \"text\" and \"url\"`,
      );
    }
  }

  if ("registration" in item) {
    if (!isPlainObject(item.registration)) {
      fail(`item ${index} field \"registration\" must be an object`);
    }

    const registration = item.registration;
    const requiredRegistrationFields = [
      "title",
      "details",
      "buttonText",
      "buttonUrl",
    ];
    for (const field of requiredRegistrationFields) {
      if (
        typeof registration[field] !== "string" ||
        registration[field].trim() === ""
      ) {
        fail(
          `item ${index} field \"registration\" is missing required non-empty string field \"${field}\"`,
        );
      }
    }

    const hasAlertTitle = "alertTitle" in registration;
    const hasAlertText = "alertText" in registration;
    if (hasAlertTitle !== hasAlertText) {
      fail(
        `item ${index} field \"registration\" must provide both \"alertTitle\" and \"alertText\" together when either is present`,
      );
    }
    if (
      hasAlertTitle &&
      (typeof registration.alertTitle !== "string" ||
        registration.alertTitle.trim() === "" ||
        typeof registration.alertText !== "string" ||
        registration.alertText.trim() === "")
    ) {
      fail(
        `item ${index} field \"registration\" alert fields must be non-empty strings`,
      );
    }

    const hasStreamText = "streamText" in registration;
    const hasStreamUrl = "streamUrl" in registration;
    if (hasStreamText !== hasStreamUrl) {
      fail(
        `item ${index} field \"registration\" must provide both \"streamText\" and \"streamUrl\" together when either is present`,
      );
    }
    if (
      hasStreamText &&
      (typeof registration.streamText !== "string" ||
        registration.streamText.trim() === "" ||
        typeof registration.streamUrl !== "string" ||
        registration.streamUrl.trim() === "")
    ) {
      fail(
        `item ${index} field \"registration\" stream fields must be non-empty strings`,
      );
    }
  }

  if ("howToAttendCardIncludes" in item) {
    if (!Array.isArray(item.howToAttendCardIncludes)) {
      fail(`item ${index} field \"howToAttendCardIncludes\" must be an array`);
    }

    item.howToAttendCardIncludes.forEach((cardInclude, cardIndex) => {
      if (typeof cardInclude !== "string" || cardInclude.trim() === "") {
        fail(
          `item ${index} field \"howToAttendCardIncludes\" contains invalid value at index ${cardIndex}`,
        );
      }
    });
  }

  if ("transit" in item) {
    if (!isPlainObject(item.transit)) {
      fail(`item ${index} field \"transit\" must be an object`);
    }
    if (
      typeof item.transit.concertLine !== "string" ||
      item.transit.concertLine.trim() === ""
    ) {
      fail(
        `item ${index} field \"transit\" must include non-empty string field \"concertLine\"`,
      );
    }
  }
});

console.log(`shows validation passed: ${shows.length} item(s)`);
