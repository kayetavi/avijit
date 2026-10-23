document.addEventListener("DOMContentLoaded", function () {
  const categoryList = document.getElementById("categoryList");
  if (!categoryList) return;

  const cats = (typeof categories !== "undefined" && Array.isArray(categories))
    ? categories
    : (typeof window !== "undefined" && Array.isArray(window.categories))
      ? window.categories
      : null;

  if (!cats) return;

  cats.forEach(cat => {
    const catLi = document.createElement("li");
    const catSpan = document.createElement("span");
    catSpan.className = "category";
    catSpan.textContent = "▶ " + cat.title;

    const ul = document.createElement("ul");
    ul.style.display = "none";

    catSpan.addEventListener("click", (e) => {
      if (e && typeof e.stopPropagation === "function") e.stopPropagation();
      ul.style.display = ul.style.display === "none" ? "block" : "none";
    });

    cat.children.forEach(child => {
      const childLi = document.createElement("li");
      const link = document.createElement("a");
      link.href = "#";
      link.textContent = child.name;
      link.onclick = (e) => {
        if (e && typeof e.preventDefault === "function") e.preventDefault();
        if (e && typeof e.stopPropagation === "function") e.stopPropagation();
        if (typeof window.navigateToApmRecord === "function") {
          window.navigateToApmRecord({ dm: child.name });
        } else {
          window.location.hash = "#0;ent=571;dm=" + encodeURIComponent(child.name);
        }
        if (typeof window.closeMobileSidebar === "function") {
          window.closeMobileSidebar();
        }
      };
      childLi.appendChild(link);
      ul.appendChild(childLi);
    });

    catLi.appendChild(catSpan);
    catLi.appendChild(ul);
    categoryList.appendChild(catLi);
  });
});
