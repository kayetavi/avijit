document.addEventListener('DOMContentLoaded', () => {
  const tocLinks = Array.from(document.querySelectorAll('.toc a[data-target]'));
  const sections = Array.from(document.querySelectorAll('main section'));
  const tocFilter = document.getElementById('tocFilter');
  const groupToggles = Array.from(document.querySelectorAll('.group-toggle'));
  const childrenLists = Array.from(document.querySelectorAll('.children'));

  // Helper: is element visible
  function isVisible(el){
    if(!el) return false;
    return window.getComputedStyle(el).display !== 'none';
  }

  // Smooth scroll with offset
  function scrollToElement(el, smooth = true){
    if(!el) return;
    const offset = 70;
    const y = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: y, behavior: smooth ? 'smooth' : 'auto' });
  }

  // Smooth scroll + keyboard support
  tocLinks.forEach(a => {
    a.addEventListener('click', function(e){
      e.preventDefault();
      const id = this.getAttribute('data-target');
      const el = document.getElementById(id);
      if(el){
        scrollToElement(el, true);
        history.replaceState(null, '', '#' + id);
      }
    });
    a.addEventListener('keydown', function(e){
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        this.click();
      }
    });
  });

  // Active link highlighting on scroll
  function updateActiveOnScroll(){
    if(sections.length === 0) return;
    let current = sections[0].id;
    for(let i = 0; i < sections.length; i++){
      if(sections[i].getBoundingClientRect().top <= 120){
        current = sections[i].id;
      }
    }
    tocLinks.forEach(link => {
      if(link.getAttribute('data-target') === current){
        link.classList.add('active');
        openParentGroupOfLink(link);
      } else {
        link.classList.remove('active');
      }
    });
  }
  window.addEventListener('scroll', updateActiveOnScroll, {passive:true});

  // Scroll to hash on load
  const initialHash = location.hash.replace('#','');
  if(initialHash){
    const el = document.getElementById(initialHash);
    if(el) scrollToElement(el,false);
  }
  updateActiveOnScroll();

  // Collapsible groups
  groupToggles.forEach(btn => {
    if(!btn.querySelector('.caret')){
      const raw = btn.textContent.trim();
      btn.innerHTML = `<span class="caret">▾</span> <span class="label">${raw}</span>`;
    }
    if(!btn.hasAttribute('aria-expanded')) btn.setAttribute('aria-expanded','false');

    btn.addEventListener('keydown', function(e){
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault(); btn.click();
      }
    });
  });

  function setToggleOpenState(btn, open){
    const caret = btn.querySelector('.caret');
    if(caret) caret.textContent = open ? '▾' : '▸';
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function closeGroup(childrenUl){
    if(!childrenUl) return;
    childrenUl.style.display = 'none';
    const toggle = childrenUl.previousElementSibling;
    if(toggle && toggle.classList.contains('group-toggle')) setToggleOpenState(toggle,false);
  }

  function openGroup(childrenUl){
    if(!childrenUl) return;
    childrenUl.style.display = '';
    const toggle = childrenUl.previousElementSibling;
    if(toggle && toggle.classList.contains('group-toggle')) setToggleOpenState(toggle,true);
  }

  function closeAllGroupsExcept(exceptUl){
    childrenLists.forEach(ul => {
      if(ul !== exceptUl) closeGroup(ul);
    });
  }

  groupToggles.forEach(btn => {
    btn.addEventListener('click', () => {
      const children = btn.nextElementSibling;
      if(!children || !children.classList.contains('children')) return;
      const open = isVisible(children);
      closeAllGroupsExcept(children);
      open ? closeGroup(children) : openGroup(children);
    });
  });

  // Open parent group of a link
  function openParentGroupOfLink(link){
    let parent = link.parentElement;
    while(parent && parent !== document){
      if(parent.classList && parent.classList.contains('children')){
        openGroup(parent);
        closeAllGroupsExcept(parent);
        return;
      }
      parent = parent.parentElement;
    }
  }

  // Recursive TOC search/filter
  if(tocFilter){
    tocFilter.addEventListener('input', function(){
      const q = this.value.trim().toLowerCase();

      function filterGroup(ul){
        let anyMatch = false;
        Array.from(ul.children).forEach(li => {
          const link = li.querySelector('a[data-target]');
          const nestedUl = li.querySelector('.children');
          let match = false;

          if(link){
            match = link.textContent.toLowerCase().includes(q);
            link.parentElement.style.display = match ? '' : 'none';
          }

          if(nestedUl){
            const nestedMatch = filterGroup(nestedUl);
            if(nestedMatch){
              openGroup(nestedUl);
              match = true;
            } else {
              closeGroup(nestedUl);
            }
          }

          if(match) anyMatch = true;
        });
        return anyMatch;
      }

      const topUL = document.getElementById('tocList');
      if(topUL) filterGroup(topUL);
    });
  }

  // Initialization: collapse all groups
  childrenLists.forEach(ul => closeGroup(ul));

  const activeFromHash = document.querySelector('.toc a.active') || document.querySelector('.toc a[href="' + location.hash + '"]');
  if(activeFromHash) openParentGroupOfLink(activeFromHash);
  updateActiveOnScroll();
});
