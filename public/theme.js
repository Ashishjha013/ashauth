(function () {
    var KEY = "ashauth-theme";

    var getPreferred = function () {
        var stored = localStorage.getItem(KEY);
        if (stored === "light" || stored === "dark") return stored;
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    };

    var apply = function (theme) {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem(KEY, theme);
    };

    apply(getPreferred());

    window.AshAuthTheme = {
        toggle: function () {
            var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
            apply(next);
            return next;
        },
        current: function () {
            return document.documentElement.getAttribute("data-theme");
        }
    };
})();
