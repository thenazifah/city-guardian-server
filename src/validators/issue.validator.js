const ApiError = require("../utils/ApiError");
const {
  ISSUE_STATUS_LIST,
  ISSUE_PRIORITY_LIST,
  ISSUE_CATEGORIES,
} = require("../utils/constants");

function parseCoordinates(coords) {
  if (!Array.isArray(coords) || coords.length !== 2) {
    throw new ApiError(400, "location.coordinates must be [longitude, latitude]");
  }

  const lng = Number(coords[0]);
  const lat = Number(coords[1]);

  if (Number.isNaN(lng) || Number.isNaN(lat)) {
    throw new ApiError(400, "location coordinates must be numbers");
  }
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    throw new ApiError(400, "location coordinates out of range");
  }

  return [lng, lat];
}

function validateLocation(input) {
  if (!input || typeof input !== "object") {
    throw new ApiError(400, "location is required");
  }

  const coordinates = parseCoordinates(input.coordinates);

  return {
    type: "Point",
    coordinates,
  };
}

function validateImages(images) {
  if (images === undefined) {
    return [];
  }

  if (!Array.isArray(images)) {
    throw new ApiError(400, "images must be an array of URLs");
  }

  if (images.length > 5) {
    throw new ApiError(400, "Maximum 5 images allowed");
  }

  for (const url of images) {
    if (typeof url !== "string" || !url.trim()) {
      throw new ApiError(400, "Each image must be a non-empty URL string");
    }
  }

  return images.map((url) => url.trim());
}

function validateCreateIssue(body) {
  const errors = [];

  if (!body.title || typeof body.title !== "string" || body.title.trim().length < 3) {
    errors.push("title is required (min 3 characters)");
  }

  if (
    !body.description ||
    typeof body.description !== "string" ||
    body.description.trim().length < 10
  ) {
    errors.push("description is required (min 10 characters)");
  }

  if (!body.category || !ISSUE_CATEGORIES.includes(body.category)) {
    errors.push(`category must be one of: ${ISSUE_CATEGORIES.join(", ")}`);
  }

  if (
    body.priority !== undefined &&
    !ISSUE_PRIORITY_LIST.includes(body.priority)
  ) {
    errors.push(`priority must be one of: ${ISSUE_PRIORITY_LIST.join(", ")}`);
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join("; "));
  }

  let location;
  try {
    location = validateLocation(body.location);
  } catch (err) {
    if (err instanceof ApiError) {
      errors.push(err.message);
    } else {
      throw err;
    }
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join("; "));
  }

  return {
    title: body.title.trim(),
    description: body.description.trim(),
    category: body.category,
    priority: body.priority || "medium",
    location,
    address:
      typeof body.address === "string" ? body.address.trim() || null : null,
    images: validateImages(body.images),
  };
}

function validateUpdateIssue(body) {
  const allowed = ["status", "priority", "assignedTo"];
  const hasField = allowed.some((key) => body[key] !== undefined);

  if (!hasField) {
    throw new ApiError(400, `Provide at least one of: ${allowed.join(", ")}`);
  }

  const errors = [];
  const payload = {};

  if (body.status !== undefined) {
    if (!ISSUE_STATUS_LIST.includes(body.status)) {
      errors.push(`status must be one of: ${ISSUE_STATUS_LIST.join(", ")}`);
    } else {
      payload.status = body.status;
    }
  }

  if (body.priority !== undefined) {
    if (!ISSUE_PRIORITY_LIST.includes(body.priority)) {
      errors.push(`priority must be one of: ${ISSUE_PRIORITY_LIST.join(", ")}`);
    } else {
      payload.priority = body.priority;
    }
  }

  if (body.assignedTo !== undefined) {
    if (body.assignedTo === null) {
      payload.assignedTo = null;
    } else if (typeof body.assignedTo !== "string") {
      errors.push("assignedTo must be a user id or null");
    } else {
      payload.assignedTo = body.assignedTo.trim();
    }
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join("; "));
  }

  return payload;
}

function validateListQuery(query) {
  const filters = {};

  if (query.status !== undefined) {
    if (!ISSUE_STATUS_LIST.includes(query.status)) {
      throw new ApiError(400, `status must be one of: ${ISSUE_STATUS_LIST.join(", ")}`);
    }
    filters.status = query.status;
  }

  if (query.category !== undefined) {
    if (!ISSUE_CATEGORIES.includes(query.category)) {
      throw new ApiError(
        400,
        `category must be one of: ${ISSUE_CATEGORIES.join(", ")}`
      );
    }
    filters.category = query.category;
  }

  if (query.assignedTo !== undefined) {
    filters.assignedTo = query.assignedTo;
  }

  if (query.mine !== undefined) {
    filters.mine = query.mine === "true" || query.mine === true;
  }

  return filters;
}

function validateCitizenUpdateIssue(body) {
  const allowed = [
    "title",
    "description",
    "category",
    "priority",
    "location",
    "address",
    "images",
  ];
  const hasField = allowed.some((key) => body[key] !== undefined);

  if (!hasField) {
    throw new ApiError(400, `Provide at least one of: ${allowed.join(", ")}`);
  }

  const errors = [];
  const payload = {};

  if (body.title !== undefined) {
    if (typeof body.title !== "string" || body.title.trim().length < 3) {
      errors.push("title must be at least 3 characters");
    } else {
      payload.title = body.title.trim();
    }
  }

  if (body.description !== undefined) {
    if (typeof body.description !== "string" || body.description.trim().length < 10) {
      errors.push("description must be at least 10 characters");
    } else {
      payload.description = body.description.trim();
    }
  }

  if (body.category !== undefined) {
    if (!ISSUE_CATEGORIES.includes(body.category)) {
      errors.push(`category must be one of: ${ISSUE_CATEGORIES.join(", ")}`);
    } else {
      payload.category = body.category;
    }
  }

  if (body.priority !== undefined) {
    if (!ISSUE_PRIORITY_LIST.includes(body.priority)) {
      errors.push(`priority must be one of: ${ISSUE_PRIORITY_LIST.join(", ")}`);
    } else {
      payload.priority = body.priority;
    }
  }

  if (body.location !== undefined) {
    try {
      payload.location = validateLocation(body.location);
    } catch (err) {
      if (err instanceof ApiError) errors.push(err.message);
    }
  }

  if (body.address !== undefined) {
    payload.address =
      typeof body.address === "string" ? body.address.trim() || null : null;
  }

  if (body.images !== undefined) {
    try {
      payload.images = validateImages(body.images);
    } catch (err) {
      if (err instanceof ApiError) errors.push(err.message);
    }
  }

  if (errors.length > 0) {
    throw new ApiError(400, errors.join("; "));
  }

  return payload;
}

module.exports = {
  validateCreateIssue,
  validateUpdateIssue,
  validateCitizenUpdateIssue,
  validateListQuery,
};
