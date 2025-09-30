// public/js/main.js

// ====================================
// FONT LOADING OPTIMIZATION
// ====================================

// Ensure fonts are loaded before showing content
document.addEventListener("DOMContentLoaded", () => {
  // Check if Font Loading API is supported
  if ('fonts' in document) {
    // Load critical fonts
    Promise.all([
      document.fonts.load('bold 3rem DrukWide'),
      document.fonts.load('400 1rem Inter')
    ]).then(() => {
      // Fonts are loaded, remove any loading states
      document.documentElement.classList.add('fonts-loaded');
    }).catch(() => {
      // Fallback if font loading fails
      document.documentElement.classList.add('fonts-loaded');
    });
    
    // Set a timeout as fallback
    setTimeout(() => {
      document.documentElement.classList.add('fonts-loaded');
    }, 1000);
  } else {
    // Browser doesn't support Font Loading API
    document.documentElement.classList.add('fonts-loaded');
  }
});

// ====================================
// MOBILE NAVIGATION
// ====================================

// Mobile navigation toggle
document.addEventListener("DOMContentLoaded", () => {
  const navToggle = document.querySelector(".nav-toggle");
  const navMenu = document.querySelector(".nav-menu");
  const hamburger = document.querySelector(".hamburger");

  console.log("Nav toggle:", navToggle);
  console.log("Nav menu:", navMenu);
  console.log("Hamburger:", hamburger);

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", (e) => {
      e.preventDefault();
      const isExpanded = navToggle.getAttribute("aria-expanded") === "true";
      console.log("Menu toggle clicked, isExpanded:", isExpanded);

      // Toggle aria-expanded attribute
      navToggle.setAttribute("aria-expanded", !isExpanded);

      // Toggle active class on menu
      navMenu.classList.toggle("active");

      console.log("Menu classes after toggle:", navMenu.className);
      console.log(
        "Nav toggle aria-expanded:",
        navToggle.getAttribute("aria-expanded")
      );

      // Toggle body class to hide header when menu is open
      document.body.classList.toggle("nav-open", !isExpanded);
    });

    // Close menu when clicking outside
    document.addEventListener("click", (e) => {
      if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
        navToggle.setAttribute("aria-expanded", "false");
        navMenu.classList.remove("active");
        document.body.classList.remove("nav-open");
      }
    });

    // Close menu when clicking a link (allow navigation to complete)
    navMenu.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", (e) => {
        console.log("Navigation link clicked:", link.href);
        // Don't prevent default - let the navigation happen
        // Add a small delay to allow the click to register before closing menu
        setTimeout(() => {
          console.log("Closing menu after navigation");
          navToggle.setAttribute("aria-expanded", "false");
          navMenu.classList.remove("active");
          document.body.classList.remove("nav-open");
        }, 100);
      });
    });

    // Close menu when pressing Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && navMenu.classList.contains("active")) {
        navToggle.setAttribute("aria-expanded", "false");
        navMenu.classList.remove("active");
        document.body.classList.remove("nav-open");
      }
    });
  }

  // Initialize header transparency
  updateHeaderBackground();
});

// Header background on scroll
function updateHeaderBackground() {
  const header = document.querySelector(".header");
  if (!header) return;

  const scrollY = window.scrollY;
  if (scrollY > 50) {
    header.style.background = "rgba(15, 15, 20, 0.12)";
    header.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.25)";
  } else {
    header.style.background = "rgba(15, 15, 20, 0.05)";
    header.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.2)";
  }
}

window.addEventListener("scroll", updateHeaderBackground);

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  });
});

// Enhanced form validation and submission
const contactForm = document.getElementById("contactForm");
if (contactForm) {
  // Real-time validation
  const inputs = contactForm.querySelectorAll("input, textarea");
  inputs.forEach((input) => {
    input.addEventListener("blur", validateField);
    input.addEventListener("input", clearError);
  });

  function validateField(e) {
    const field = e.target;
    const value = field.value.trim();
    const fieldName = field.name;

    clearError(e);

    if (!value) {
      showFieldError(
        field,
        `${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)} is required`
      );
      return false;
    }

    if (fieldName === "email" && !isValidEmail(value)) {
      showFieldError(field, "Please enter a valid email address");
      return false;
    }

    return true;
  }

  function clearError(e) {
    const field = e.target;
    const errorElement = field.parentNode.querySelector(".field-error");
    if (errorElement) {
      errorElement.remove();
    }
    field.classList.remove("error");
  }

  function showFieldError(field, message) {
    field.classList.add("error");
    const errorElement = document.createElement("span");
    errorElement.className = "field-error";
    errorElement.textContent = message;
    field.parentNode.appendChild(errorElement);
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Validate all fields
    let isValid = true;
    inputs.forEach((input) => {
      if (!validateField({ target: input })) {
        isValid = false;
      }
    });

    if (!isValid) return;

    const formData = new FormData(contactForm);
    const submitButton = contactForm.querySelector('button[type="submit"]');
    const submitText = submitButton.querySelector(".submit-text");
    const submitLoading = submitButton.querySelector(".submit-loading");

    // Disable button during submission
    submitButton.disabled = true;
    if (submitText && submitLoading) {
      submitText.style.display = "none";
      submitLoading.style.display = "inline";
    } else {
      submitButton.textContent = "Sending...";
    }
    submitButton.classList.add("loading");

    try {
      // Submit directly to Formspree
      const response = await fetch(contactForm.action, {
        method: "POST",
        body: formData,
        headers: {
          Accept: "application/json",
        },
      });

      if (response.ok) {
        showSuccessMessage();
        contactForm.reset();

        // Redirect to thank you page after a brief delay
        setTimeout(() => {
          window.location.href = "/thank-you.html";
        }, 2000);
      } else {
        const data = await response.json();
        if (data.errors) {
          showErrorMessage(
            data.errors.map((error) => error.message).join(", ")
          );
        } else {
          showErrorMessage("An error occurred. Please try again.");
        }
      }
    } catch (error) {
      console.error("Error:", error);
      showErrorMessage(
        "Network error. Please check your connection and try again."
      );
    } finally {
      // Re-enable button
      submitButton.disabled = false;
      if (submitText && submitLoading) {
        submitText.style.display = "inline";
        submitLoading.style.display = "none";
      } else {
        submitButton.textContent = "Send Message";
      }
      submitButton.classList.remove("loading");
    }
  });

  function showSuccessMessage() {
    const message = document.createElement("div");
    message.className = "form-message success";
    message.textContent =
      "Thank you for your message! I'll get back to you soon.";
    contactForm.appendChild(message);

    setTimeout(() => {
      message.remove();
    }, 5000);
  }

  function showErrorMessage(text) {
    const message = document.createElement("div");
    message.className = "form-message error";
    message.textContent = text;
    contactForm.appendChild(message);

    setTimeout(() => {
      message.remove();
    }, 5000);
  }
}

// Intersection Observer for animations
const observerOptions = {
  threshold: 0.1,
  rootMargin: "0px 0px -50px 0px",
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("animate-in");
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

// Initialize animations
document.addEventListener("DOMContentLoaded", () => {
  const animatedElements = document.querySelectorAll(
    ".bento-item, .project-card, .about-card, .skill-card"
  );
  animatedElements.forEach((element) => {
    element.classList.add("animate-on-scroll");
    observer.observe(element);
  });
});

// Tech icon hover effects
document.addEventListener("DOMContentLoaded", () => {
  const techIcons = document.querySelectorAll(".tech-icon");
  techIcons.forEach((icon) => {
    icon.addEventListener("mouseenter", (e) => {
      const tooltip = document.createElement("div");
      tooltip.className = "tech-tooltip";
      tooltip.textContent = e.target.alt || e.target.title;
      document.body.appendChild(tooltip);

      const rect = e.target.getBoundingClientRect();
      tooltip.style.left =
        rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + "px";
      tooltip.style.top = rect.top - tooltip.offsetHeight - 8 + "px";
    });

    icon.addEventListener("mouseleave", () => {
      const tooltip = document.querySelector(".tech-tooltip");
      if (tooltip) {
        tooltip.remove();
      }
    });
  });
});

// Optimized parallax effect with requestAnimationFrame and throttling
let ticking = false;
let lastScrollY = 0;

function updateParallax() {
  const scrolled = window.pageYOffset;

  // Only update if scroll position changed significantly
  if (Math.abs(scrolled - lastScrollY) > 1) {
    const parallaxElements = document.querySelectorAll(
      ".aurora-background, .aurora-background-2"
    );

    parallaxElements.forEach((element, index) => {
      const speed = 0.3 + index * 0.1; // Reduced speed for better performance
      element.style.transform = `translate3d(0, ${scrolled * speed}px, 0)`;
    });

    lastScrollY = scrolled;
  }

  ticking = false;
}

window.addEventListener("scroll", () => {
  if (!ticking) {
    requestAnimationFrame(updateParallax);
    ticking = true;
  }
});

// Optimized project card interactions
document.addEventListener("DOMContentLoaded", () => {
  const projectCards = document.querySelectorAll(".project-card");

  projectCards.forEach((card) => {
    // Add performance hints
    card.style.willChange = "transform";
    card.style.backfaceVisibility = "hidden";

    card.addEventListener("mouseenter", (e) => {
      e.currentTarget.style.transform = "translate3d(0, -12px, 0) scale(1.02)";
    });

    card.addEventListener("mouseleave", (e) => {
      e.currentTarget.style.transform = "translate3d(0, 0, 0) scale(1)";
    });
  });
});

// Pagination functionality for work page
document.addEventListener("DOMContentLoaded", () => {
  const projectGrid = document.getElementById("projectGrid");
  const paginationNumbers = document.getElementById("paginationNumbers");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const pageInfo = document.getElementById("pageInfo");

  if (!projectGrid || !paginationNumbers) return; // Not on work page

  let currentPage = 1;
  const projectCards = Array.from(
    projectGrid.querySelectorAll(".project-card")
  );
  const totalPages = Math.max(
    ...projectCards.map((card) => parseInt(card.dataset.page))
  );

  // Show projects for specific page
  function showPage(pageNumber, shouldScroll = true) {
    currentPage = pageNumber;

    // Hide all project cards
    projectCards.forEach((card) => {
      card.style.display = "none";
      card.style.opacity = "0";
      card.style.transform = "translateY(20px)";
    });

    // Show cards for current page with staggered animation
    const cardsToShow = projectCards.filter(
      (card) => parseInt(card.dataset.page) === pageNumber
    );

    cardsToShow.forEach((card, index) => {
      card.style.display = "block";
      setTimeout(() => {
        card.style.opacity = "1";
        card.style.transform = "translateY(0)";
      }, index * 100); // Staggered animation
    });

    // Update pagination UI
    updatePaginationUI();

    // Only scroll if explicitly requested (for pagination clicks, not initial load)
    if (shouldScroll) {
      // Scroll to top of project grid smoothly
      projectGrid.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      });
    }
  }

  // Update pagination button states and info
  function updatePaginationUI() {
    // Update page numbers
    document.querySelectorAll(".pagination-number").forEach((btn) => {
      btn.classList.toggle(
        "active",
        parseInt(btn.dataset.page) === currentPage
      );
    });

    // Update prev/next buttons
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;

    // Update page info
    if (pageInfo) {
      pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    }
  }

  // Event listeners for pagination numbers
  document.querySelectorAll(".pagination-number").forEach((btn) => {
    btn.addEventListener("click", () => {
      const pageNumber = parseInt(btn.dataset.page);
      showPage(pageNumber);
    });
  });

  // Event listeners for prev/next buttons
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        showPage(currentPage - 1);
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (currentPage < totalPages) {
        showPage(currentPage + 1);
      }
    });
  }

  // Keyboard navigation
  document.addEventListener("keydown", (e) => {
    if (e.target.closest(".pagination")) {
      if (e.key === "ArrowLeft" && currentPage > 1) {
        e.preventDefault();
        showPage(currentPage - 1);
      } else if (e.key === "ArrowRight" && currentPage < totalPages) {
        e.preventDefault();
        showPage(currentPage + 1);
      }
    }
  });

  // Initialize first page without scrolling
  showPage(1, false);
});
