import { validatePersistentState } from "./validation.js";

const DATA_ELEMENT_ID = "app-data";
const ROOT_ELEMENT_ID = "root";

export function readInitialData() {
  const dataElement = document.getElementById(DATA_ELEMENT_ID);

  if (!dataElement) {
    return { data: null, fatalError: "Could not start the application: the #app-data block was not found." };
  }

  try {
    const data = migratePersistentState(JSON.parse(dataElement.textContent));
    const validation = validatePersistentState(data);
    if (!validation.ok) throw new Error(validation.message);
    return { data, fatalError: "" };
  } catch (error) {
    return {
      data: null,
      fatalError: `Could not start the application because its embedded data is invalid: ${error.message}`
    };
  }
}

export function migratePersistentState(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return data;
  if (data.schemaVersion !== 3) return data;

  // Schema 3 has totals but no event history, so manufacturing daily records would be misleading.
  return { ...data, schemaVersion: 4, statistics: { daily: [] } };
}

function serializeData(data) {
  return JSON.stringify(data, null, 2).replace(/</g, "\\u003c");
}

// Build a self-contained copy by replacing embedded data and clearing rendered React output.
export function createUpdatedHtml(data) {
  const validation = validatePersistentState(data);
  if (!validation.ok) throw new Error(`persistent data validation failed: ${validation.message}`);

  const serializedData = serializeData(data);
  const roundTripValidation = validatePersistentState(JSON.parse(serializedData));
  if (!roundTripValidation.ok) throw new Error(`serialized data validation failed: ${roundTripValidation.message}`);

  const htmlClone = document.documentElement.cloneNode(true);
  const dataElement = htmlClone.querySelector(`#${DATA_ELEMENT_ID}`);
  const rootElement = htmlClone.querySelector(`#${ROOT_ELEMENT_ID}`);

  if (!dataElement) throw new Error("The app-data block was not found");
  if (!rootElement) throw new Error("The React root element was not found");

  dataElement.textContent = serializedData;
  rootElement.replaceChildren();
  htmlClone.querySelectorAll("[data-temporary]").forEach((element) => element.remove());

  return "<!doctype html>\n" + htmlClone.outerHTML;
}
