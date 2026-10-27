import itemPage from "./site/items/123456-fixture/index.html?raw";
import minimalPage from "./site/items/654321-minimal/index.html?raw";
import newListingPage from "./site/items/new/index.html?raw";

const PAGES = {
  item: itemPage,
  minimal: minimalPage,
  newListing: newListingPage,
};

export const loadPage = (page: keyof typeof PAGES): Document =>
  new DOMParser().parseFromString(PAGES[page], "text/html");
