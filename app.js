/*
 * Bramble & Co. — booking demo
 * Entirely client-side: "accounts" and bookings live in localStorage.
 * Not real auth — passwords are stored in plain text in the browser.
 * See README.md for the demo credentials.
 */

(function () {
  "use strict";

  var STORAGE = {
    users: "bw_users",
    bookings: "bw_bookings",
    session: "bw_session",
    theme: "bw_theme",
    seeded: "bw_seeded_v1"
  };

  var SERVICES = [
    { id: "consult", name: "Consultation", duration: 30, price: 0, priceLabel: "Free", blurb: "A first conversation to work out what you need." },
    { id: "massage", name: "Deep Tissue Massage", duration: 60, price: 95, priceLabel: "$95", blurb: "Full-body tension relief, focused on problem areas." },
    { id: "acupuncture", name: "Acupuncture Session", duration: 45, price: 85, priceLabel: "$85", blurb: "Traditional needling for pain and stress relief." },
    { id: "nutrition", name: "Nutrition Coaching", duration: 45, price: 70, priceLabel: "$70", blurb: "A personalized eating plan built around your goals." }
  ];

  var BUSINESS_START = 9 * 60;
  var BUSINESS_END = 17 * 60;

  var DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // ---------- generic helpers ----------

  function pad(n) { return String(n).padStart(2, "0"); }

  function dateKey(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }

  function addDays(d, n) { var nd = new Date(d); nd.setDate(nd.getDate() + n); return nd; }

  function formatTime(mins) {
    var h = Math.floor(mins / 60), m = mins % 60;
    var ampm = h >= 12 ? "PM" : "AM";
    var h12 = h % 12; if (h12 === 0) h12 = 12;
    return h12 + ":" + pad(m) + " " + ampm;
  }

  function formatDateLong(key) {
    var parts = key.split("-").map(Number);
    var d = new Date(parts[0], parts[1] - 1, parts[2]);
    return DAY_NAMES[d.getDay()] + ", " + MONTH_NAMES[d.getMonth()] + " " + d.getDate();
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function initials(name) {
    return name.trim().split(/\s+/).slice(0, 2).map(function (p) { return p[0].toUpperCase(); }).join("");
  }

  function uid(prefix) {
    return prefix + "_" + Math.random().toString(36).slice(2, 10);
  }

  function generateSlots(service) {
    var slots = [];
    for (var t = BUSINESS_START; t + service.duration <= BUSINESS_END; t += service.duration) {
      slots.push(formatTime(t));
    }
    return slots;
  }

  // ---------- storage ----------

  function load(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getUsers() { return load(STORAGE.users, []); }
  function saveUsers(u) { save(STORAGE.users, u); }
  function getBookings() { return load(STORAGE.bookings, []); }
  function saveBookings(b) { save(STORAGE.bookings, b); }
  function getSession() { return load(STORAGE.session, null); }
  function setSession(s) { s ? save(STORAGE.session, s) : localStorage.removeItem(STORAGE.session); }

  function seedIfNeeded() {
    if (localStorage.getItem(STORAGE.seeded)) return;

    var users = [
      { name: "Studio Admin", email: "admin@bramble.test", password: "admin123", role: "admin" },
      { name: "Jordan Lee", email: "jordan@example.com", password: "password123", role: "client" }
    ];

    var today = dateKey(new Date());
    var tomorrow = dateKey(addDays(new Date(), 1));
    var inThreeDays = dateKey(addDays(new Date(), 3));

    var bookings = [
      { id: uid("bk"), serviceId: "massage", date: today, time: "11:00 AM", name: "Jordan Lee", email: "jordan@example.com", status: "upcoming", createdAt: Date.now() },
      { id: uid("bk"), serviceId: "consult", date: today, time: "2:00 PM", name: "Riley Chen", email: "riley@example.com", status: "upcoming", createdAt: Date.now() },
      { id: uid("bk"), serviceId: "acupuncture", date: tomorrow, time: "9:45 AM", name: "Jordan Lee", email: "jordan@example.com", status: "upcoming", createdAt: Date.now() },
      { id: uid("bk"), serviceId: "nutrition", date: tomorrow, time: "1:00 PM", name: "Sam Okafor", email: "sam@example.com", status: "upcoming", createdAt: Date.now() },
      { id: uid("bk"), serviceId: "massage", date: inThreeDays, time: "10:00 AM", name: "Riley Chen", email: "riley@example.com", status: "upcoming", createdAt: Date.now() }
    ];

    saveUsers(users);
    saveBookings(bookings);
    localStorage.setItem(STORAGE.seeded, "1");
  }

  // ---------- toast ----------

  var toastTimer = null;
  function toast(message) {
    var el = document.getElementById("toast");
    el.textContent = message;
    el.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("is-visible"); }, 2600);
  }

  // ---------- theme ----------

  function initTheme() {
    var saved = localStorage.getItem(STORAGE.theme);
    var theme = saved || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    applyTheme(theme);
    document.getElementById("theme-toggle").addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      localStorage.setItem(STORAGE.theme, next);
    });
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var btn = document.getElementById("theme-toggle");
    btn.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
  }

  // ---------- view state (transient, per navigation) ----------

  var viewState = {
    selectedServiceId: SERVICES[0].id,
    selectedDate: dateKey(new Date()),
    selectedSlot: null,
    authTab: "signin",
    redirectAfterLogin: null
  };

  // ---------- routing ----------

  function currentRoute() {
    var hash = location.hash.replace(/^#/, "");
    return hash || "/book";
  }

  function navigate(route) {
    location.hash = "#" + route;
  }

  function route() {
    var path = currentRoute();
    var session = getSession();

    updateAuthSlot(session);
    updateNav(path, session);

    var app = document.getElementById("app");

    if (path === "/account") {
      if (!session) {
        viewState.redirectAfterLogin = "/account";
        navigate("/login");
        return;
      }
      app.innerHTML = renderAccountView(session);
      bindAccountView(session);
      return;
    }

    if (path === "/admin") {
      if (!session) {
        viewState.redirectAfterLogin = "/admin";
        navigate("/login");
        return;
      }
      if (session.role !== "admin") {
        toast("You don't have access to that page.");
        navigate("/book");
        return;
      }
      app.innerHTML = renderAdminView();
      bindAdminView();
      return;
    }

    if (path === "/login") {
      app.innerHTML = renderLoginView();
      bindLoginView(session);
      return;
    }

    // default: /book
    app.innerHTML = renderBookView(session);
    bindBookView(session);
  }

  function updateNav(path, session) {
    document.querySelectorAll(".nav-link").forEach(function (a) {
      a.classList.toggle("is-active", a.dataset.route === path);
    });
    document.querySelector(".nav-admin-link").classList.toggle("is-hidden", !(session && session.role === "admin"));
  }

  function updateAuthSlot(session) {
    var slot = document.getElementById("auth-slot");
    if (!session) {
      slot.innerHTML = '<a href="#/login" class="btn btn-primary">Sign in</a>';
      return;
    }
    slot.innerHTML =
      '<div class="user-chip">' +
        '<span class="avatar">' + escapeHtml(initials(session.name)) + "</span>" +
        '<span>' +
          '<span class="user-chip-name">' + escapeHtml(session.name) +
            '<span class="user-chip-role">' + (session.role === "admin" ? "Admin" : "Client") + "</span>" +
          "</span>" +
        "</span>" +
      "</div>" +
      '<button class="btn-text" id="sign-out-btn" type="button">Sign out</button>';

    document.getElementById("sign-out-btn").addEventListener("click", function () {
      setSession(null);
      toast("Signed out.");
      navigate("/book");
    });
  }

  // ---------- BOOK view ----------

  function renderBookView(session) {
    var service = SERVICES.find(function (s) { return s.id === viewState.selectedServiceId; }) || SERVICES[0];
    var days = [];
    for (var i = 0; i < 7; i++) days.push(addDays(new Date(), i));

    var bookings = getBookings();
    var slots = generateSlots(service).map(function (time) {
      var isBooked = bookings.some(function (b) {
        return b.date === viewState.selectedDate && b.serviceId === service.id && b.time === time && b.status !== "cancelled";
      });
      var isSelected = viewState.selectedSlot === time;
      var cls = "slot-btn" + (isBooked ? " is-booked" : "") + (isSelected ? " is-selected" : "");
      return '<button type="button" class="' + cls + '" data-slot="' + escapeHtml(time) + '"' + (isBooked ? " disabled" : "") + ">" + time + "</button>";
    }).join("");

    var servicesHtml = SERVICES.map(function (s) {
      var cls = "service-card" + (s.id === service.id ? " is-selected" : "");
      return (
        '<button type="button" class="' + cls + '" data-service="' + s.id + '">' +
          '<span class="service-card-top">' +
            '<span class="service-name">' + escapeHtml(s.name) + "</span>" +
            '<span class="service-price">' + s.priceLabel + " · " + s.duration + "m</span>" +
          "</span>" +
          '<span class="service-meta">' + escapeHtml(s.blurb) + "</span>" +
        "</button>"
      );
    }).join("");

    var dateStripHtml = days.map(function (d) {
      var key = dateKey(d);
      var cls = "date-pill" + (key === viewState.selectedDate ? " is-selected" : "");
      return (
        '<button type="button" class="' + cls + '" data-date="' + key + '">' +
          '<span class="date-pill-day">' + DAY_NAMES[d.getDay()] + "</span>" +
          '<span class="date-pill-num">' + d.getDate() + "</span>" +
        "</button>"
      );
    }).join("");

    var formHtml = "";
    if (viewState.selectedSlot) {
      var prefillName = session ? session.name : "";
      var prefillEmail = session ? session.email : "";
      formHtml =
        '<form class="booking-form" id="booking-form" novalidate>' +
          '<div class="booking-summary">' +
            escapeHtml(service.name) + " on <strong>" + formatDateLong(viewState.selectedDate) + "</strong> at <strong>" + viewState.selectedSlot + "</strong> — " + service.priceLabel +
          "</div>" +
          '<div class="field-row">' +
            '<div class="field">' +
              '<label for="bk-name">Name</label>' +
              '<input id="bk-name" name="name" type="text" value="' + escapeHtml(prefillName) + '" ' + (session ? "readonly" : "") + ' placeholder="Your full name" />' +
            "</div>" +
            '<div class="field">' +
              '<label for="bk-email">Email</label>' +
              '<input id="bk-email" name="email" type="email" value="' + escapeHtml(prefillEmail) + '" ' + (session ? "readonly" : "") + ' placeholder="you@example.com" />' +
            "</div>" +
          "</div>" +
          '<p class="field-error" id="booking-error"></p>' +
          '<div class="form-actions">' +
            '<button type="submit" class="btn btn-primary">Confirm booking</button>' +
            '<button type="button" class="btn-text" id="cancel-select">Choose a different time</button>' +
          "</div>" +
        "</form>";
    }

    return (
      '<div class="book-layout">' +
        '<div class="book-intro">' +
          '<p class="eyebrow">Bramble &amp; Co. studio</p>' +
          "<h1>Book a session that fits your afternoon.</h1>" +
          "<p>Pick a service, then an open slot. Sessions run back to back, so what you see below is what's actually free today.</p>" +
          '<div class="service-list">' + servicesHtml + "</div>" +
        "</div>" +
        '<div class="book-schedule">' +
          '<div class="schedule-head">' +
            "<h2>Open times</h2>" +
            '<span class="schedule-service">' + escapeHtml(service.name) + " · " + service.duration + " min</span>" +
          "</div>" +
          '<div class="date-strip">' + dateStripHtml + "</div>" +
          '<div class="slot-grid">' + (slots || "<p>No slots for this service.</p>") + "</div>" +
          '<div class="slot-legend">' +
            '<span><span class="legend-dot open"></span>Open</span>' +
            '<span><span class="legend-dot selected"></span>Selected</span>' +
            '<span><span class="legend-dot booked"></span>Booked</span>' +
          "</div>" +
          formHtml +
        "</div>" +
      "</div>"
    );
  }

  function bindBookView(session) {
    document.querySelectorAll("[data-service]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        viewState.selectedServiceId = btn.dataset.service;
        viewState.selectedSlot = null;
        route();
      });
    });

    document.querySelectorAll("[data-date]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        viewState.selectedDate = btn.dataset.date;
        viewState.selectedSlot = null;
        route();
      });
    });

    document.querySelectorAll("[data-slot]:not([disabled])").forEach(function (btn) {
      btn.addEventListener("click", function () {
        viewState.selectedSlot = btn.dataset.slot;
        route();
      });
    });

    var cancelSelect = document.getElementById("cancel-select");
    if (cancelSelect) {
      cancelSelect.addEventListener("click", function () {
        viewState.selectedSlot = null;
        route();
      });
    }

    var form = document.getElementById("booking-form");
    if (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var name = form.name.value.trim();
        var email = form.email.value.trim();
        var errorEl = document.getElementById("booking-error");

        if (!name || !email || email.indexOf("@") === -1) {
          errorEl.textContent = "Enter a name and a valid email to confirm.";
          return;
        }
        errorEl.textContent = "";

        var bookings = getBookings();
        bookings.push({
          id: uid("bk"),
          serviceId: viewState.selectedServiceId,
          date: viewState.selectedDate,
          time: viewState.selectedSlot,
          name: name,
          email: email,
          status: "upcoming",
          createdAt: Date.now()
        });
        saveBookings(bookings);

        viewState.selectedSlot = null;
        toast("Booked. See you then.");
        route();
      });
    }
  }

  // ---------- ACCOUNT view ----------

  function renderAccountView(session) {
    var bookings = getBookings()
      .filter(function (b) { return b.email.toLowerCase() === session.email.toLowerCase(); })
      .sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); });

    if (bookings.length === 0) {
      return (
        '<div class="panel">' +
          '<div class="panel-header"><h1>My bookings</h1></div>' +
          '<div class="empty-state">' +
            "<h3>Nothing on the books yet</h3>" +
            "<p>When you book a session, it'll show up here so you can keep track of it.</p>" +
            '<a href="#/book" class="btn btn-primary">Book a session</a>' +
          "</div>" +
        "</div>"
      );
    }

    var rows = bookings.map(function (b) {
      var service = SERVICES.find(function (s) { return s.id === b.serviceId; });
      var canCancel = b.status === "upcoming";
      return (
        '<div class="booking-row">' +
          '<div class="booking-date"><strong>' + b.date.slice(5) + "</strong>" + b.time + "</div>" +
          '<div class="booking-info">' +
            "<h4>" + escapeHtml(service ? service.name : b.serviceId) + "</h4>" +
            "<span>" + formatDateLong(b.date) + "</span>" +
          "</div>" +
          '<span class="status-pill status-' + b.status + '">' + b.status + "</span>" +
          (canCancel ? '<button type="button" class="btn-danger-text" data-cancel="' + b.id + '">Cancel</button>' : "<span></span>") +
        "</div>"
      );
    }).join("");

    return (
      '<div class="panel">' +
        '<div class="panel-header">' +
          "<div><h1>My bookings</h1><p>Signed in as " + escapeHtml(session.email) + "</p></div>" +
          '<a href="#/book" class="btn btn-ghost">Book another</a>' +
        "</div>" +
        '<div class="booking-list">' + rows + "</div>" +
      "</div>"
    );
  }

  function bindAccountView(session) {
    document.querySelectorAll("[data-cancel]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var bookings = getBookings();
        var b = bookings.find(function (x) { return x.id === btn.dataset.cancel; });
        if (b) b.status = "cancelled";
        saveBookings(bookings);
        toast("Booking cancelled.");
        route();
      });
    });
  }

  // ---------- ADMIN view ----------

  function renderAdminView() {
    var bookings = getBookings().sort(function (a, b) { return (b.date + b.time).localeCompare(a.date + a.time); });
    var today = dateKey(new Date());
    var weekEnd = dateKey(addDays(new Date(), 7));

    var todayCount = bookings.filter(function (b) { return b.date === today && b.status !== "cancelled"; }).length;
    var weekCount = bookings.filter(function (b) { return b.date >= today && b.date <= weekEnd && b.status !== "cancelled"; }).length;
    var uniqueClients = new Set(bookings.map(function (b) { return b.email.toLowerCase(); })).size;
    var activeCount = bookings.filter(function (b) { return b.status !== "cancelled"; }).length;

    var serviceOptions = '<option value="">All services</option>' + SERVICES.map(function (s) {
      return '<option value="' + s.id + '">' + escapeHtml(s.name) + "</option>";
    }).join("");

    var rows = bookings.map(function (b) {
      var service = SERVICES.find(function (s) { return s.id === b.serviceId; });
      var actions = "";
      if (b.status === "upcoming") {
        actions =
          '<button type="button" class="btn btn-small btn-ghost" data-complete="' + b.id + '">Mark complete</button>' +
          '<button type="button" class="btn-danger-text" data-admin-cancel="' + b.id + '">Cancel</button>';
      }
      return (
        '<tr data-service-id="' + b.serviceId + '" data-status="' + b.status + '" data-search="' + escapeHtml((b.name + " " + b.email).toLowerCase()) + '">' +
          "<td>" + formatDateLong(b.date) + "</td>" +
          '<td class="cell-time">' + b.time + "</td>" +
          "<td>" + escapeHtml(service ? service.name : b.serviceId) + "</td>" +
          "<td>" + escapeHtml(b.name) + '<br><span style="color:var(--muted);font-size:0.8em">' + escapeHtml(b.email) + "</span></td>" +
          '<td><span class="status-pill status-' + b.status + '">' + b.status + "</span></td>" +
          '<td class="cell-actions">' + actions + "</td>" +
        "</tr>"
      );
    }).join("");

    return (
      '<div>' +
        '<div class="panel-header">' +
          "<div><h1>Studio dashboard</h1><p>Every booking made across the site.</p></div>" +
        "</div>" +
        '<div class="stat-grid">' +
          '<div class="stat-tile"><div class="stat-value">' + todayCount + '</div><div class="stat-label">Today</div></div>' +
          '<div class="stat-tile"><div class="stat-value">' + weekCount + '</div><div class="stat-label">Next 7 days</div></div>' +
          '<div class="stat-tile"><div class="stat-value">' + activeCount + '</div><div class="stat-label">Active bookings</div></div>' +
          '<div class="stat-tile"><div class="stat-value">' + uniqueClients + '</div><div class="stat-label">Unique clients</div></div>' +
        "</div>" +
        '<div class="admin-filters">' +
          '<select id="filter-service">' + serviceOptions + "</select>" +
          '<select id="filter-status">' +
            '<option value="">All statuses</option>' +
            '<option value="upcoming">Upcoming</option>' +
            '<option value="completed">Completed</option>' +
            '<option value="cancelled">Cancelled</option>' +
          "</select>" +
          '<input id="filter-search" type="search" placeholder="Search name or email" />' +
        "</div>" +
        '<div class="table-wrap">' +
          '<table class="admin-table">' +
            "<thead><tr><th>Date</th><th>Time</th><th>Service</th><th>Client</th><th>Status</th><th></th></tr></thead>" +
            "<tbody id=\"admin-tbody\">" + (rows || '<tr><td colspan="6" style="padding:2rem;text-align:center;color:var(--muted)">No bookings yet.</td></tr>') + "</tbody>" +
          "</table>" +
        "</div>" +
      "</div>"
    );
  }

  function bindAdminView() {
    function applyFilters() {
      var service = document.getElementById("filter-service").value;
      var status = document.getElementById("filter-status").value;
      var search = document.getElementById("filter-search").value.trim().toLowerCase();

      document.querySelectorAll("#admin-tbody tr[data-service-id]").forEach(function (tr) {
        var matches =
          (!service || tr.dataset.serviceId === service) &&
          (!status || tr.dataset.status === status) &&
          (!search || tr.dataset.search.indexOf(search) !== -1);
        tr.style.display = matches ? "" : "none";
      });
    }

    ["filter-service", "filter-status"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener("change", applyFilters);
    });
    var searchEl = document.getElementById("filter-search");
    if (searchEl) searchEl.addEventListener("input", applyFilters);

    document.querySelectorAll("[data-complete]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var bookings = getBookings();
        var b = bookings.find(function (x) { return x.id === btn.dataset.complete; });
        if (b) b.status = "completed";
        saveBookings(bookings);
        toast("Marked complete.");
        route();
      });
    });

    document.querySelectorAll("[data-admin-cancel]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var bookings = getBookings();
        var b = bookings.find(function (x) { return x.id === btn.dataset.adminCancel; });
        if (b) b.status = "cancelled";
        saveBookings(bookings);
        toast("Booking cancelled.");
        route();
      });
    });
  }

  // ---------- LOGIN view ----------

  function renderLoginView() {
    var isSignIn = viewState.authTab === "signin";
    return (
      '<div class="auth-wrap">' +
        '<div class="auth-tabs">' +
          '<button type="button" class="auth-tab' + (isSignIn ? " is-active" : "") + '" data-tab="signin">Sign in</button>' +
          '<button type="button" class="auth-tab' + (!isSignIn ? " is-active" : "") + '" data-tab="signup">Create account</button>' +
        "</div>" +
        (isSignIn ? renderSignInForm() : renderSignUpForm()) +
        '<div class="demo-box">' +
          "<p><strong>Demo credentials</strong></p>" +
          '<p>Admin — <code>admin@bramble.test</code> / <code>admin123</code></p>' +
          '<p>Client — <code>jordan@example.com</code> / <code>password123</code></p>' +
        "</div>" +
      "</div>"
    );
  }

  function renderSignInForm() {
    return (
      '<form class="auth-form" id="signin-form" novalidate>' +
        '<div class="field"><label for="si-email">Email</label><input id="si-email" type="email" placeholder="you@example.com" /></div>' +
        '<div class="field"><label for="si-password">Password</label><input id="si-password" type="password" placeholder="••••••••" /></div>' +
        '<div id="signin-message"></div>' +
        '<button type="submit" class="btn btn-primary">Sign in</button>' +
      "</form>"
    );
  }

  function renderSignUpForm() {
    return (
      '<form class="auth-form" id="signup-form" novalidate>' +
        '<div class="field"><label for="su-name">Name</label><input id="su-name" type="text" placeholder="Your full name" /></div>' +
        '<div class="field"><label for="su-email">Email</label><input id="su-email" type="email" placeholder="you@example.com" /></div>' +
        '<div class="field"><label for="su-password">Password</label><input id="su-password" type="password" placeholder="At least 6 characters" /></div>' +
        '<div id="signup-message"></div>' +
        '<button type="submit" class="btn btn-primary">Create account</button>' +
      "</form>"
    );
  }

  function bindLoginView() {
    document.querySelectorAll("[data-tab]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        viewState.authTab = btn.dataset.tab;
        route();
      });
    });

    var signInForm = document.getElementById("signin-form");
    if (signInForm) {
      signInForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var email = document.getElementById("si-email").value.trim().toLowerCase();
        var password = document.getElementById("si-password").value;
        var msg = document.getElementById("signin-message");

        var user = getUsers().find(function (u) { return u.email.toLowerCase() === email; });
        if (!user || user.password !== password) {
          msg.innerHTML = '<p class="form-message">That email and password don\'t match. Try again or create an account.</p>';
          return;
        }

        setSession({ name: user.name, email: user.email, role: user.role });
        toast("Welcome back, " + user.name.split(" ")[0] + ".");
        var target = viewState.redirectAfterLogin || (user.role === "admin" ? "/admin" : "/book");
        viewState.redirectAfterLogin = null;
        navigate(target);
      });
    }

    var signUpForm = document.getElementById("signup-form");
    if (signUpForm) {
      signUpForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var name = document.getElementById("su-name").value.trim();
        var email = document.getElementById("su-email").value.trim().toLowerCase();
        var password = document.getElementById("su-password").value;
        var msg = document.getElementById("signup-message");

        if (!name || !email || email.indexOf("@") === -1 || password.length < 6) {
          msg.innerHTML = '<p class="form-message">Fill in your name, a valid email, and a password of at least 6 characters.</p>';
          return;
        }

        var users = getUsers();
        if (users.some(function (u) { return u.email.toLowerCase() === email; })) {
          msg.innerHTML = '<p class="form-message">An account with that email already exists. Sign in instead.</p>';
          return;
        }

        users.push({ name: name, email: email, password: password, role: "client" });
        saveUsers(users);
        setSession({ name: name, email: email, role: "client" });
        toast("Account created. Welcome, " + name.split(" ")[0] + ".");
        var target = viewState.redirectAfterLogin || "/book";
        viewState.redirectAfterLogin = null;
        navigate(target);
      });
    }
  }

  // ---------- init ----------

  function init() {
    seedIfNeeded();
    initTheme();
    window.addEventListener("hashchange", route);
    route();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
