document.addEventListener("DOMContentLoaded", function () {
  const searchBox = document.getElementById("searchBox");
  if (!searchBox) return;

  searchBox.addEventListener("input", function () {
    const query = this.value.toLowerCase().trim();
    const categories = document.querySelectorAll("#categoryList > li");

    categories.forEach((categoryItem) => {
      // If category is hidden by RBAC, keep it hidden!
      if (categoryItem.getAttribute("data-rbac-hidden") === "true") {
        categoryItem.style.display = "none";
        return;
      }

      const categoryTitle = categoryItem.querySelector(".category");
      const mechanismList = categoryItem.querySelector("ul");
      const mechanismItems = mechanismList ? mechanismList.querySelectorAll("li") : [];

      let hasMatch = false;

      mechanismItems.forEach((item) => {
        // If this item is hidden by RBAC, never display it!
        if (item.getAttribute("data-rbac-hidden") === "true") {
          item.style.display = "none";
          return;
        }

        if (!query) {
          item.style.display = "";
          return;
        }

        const text = item.textContent.toLowerCase();
        const isMatch = text.includes(query);
        item.style.display = isMatch ? "list-item" : "none";
        if (isMatch) hasMatch = true;
      });

      if (!query) {
        categoryItem.style.display = "";
        if (mechanismList) mechanismList.style.display = "none";
        return;
      }

      const categoryMatches = categoryTitle && categoryTitle.textContent.toLowerCase().includes(query);

      if (categoryMatches || hasMatch) {
        categoryItem.style.display = "block";
        if (mechanismList) mechanismList.style.display = "block";
      } else {
        categoryItem.style.display = "none";
        if (mechanismList) mechanismList.style.display = "none";
      }
    });
  });
});
