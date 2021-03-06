const fs = require("fs");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const webflowHtmlParser = (htmlPath, assestsUrl) => {
  const externalUrlRgx = new RegExp(
    /^(http|https)\:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,6}(\/\S*)?$/
  );

  const rawHtml = fs.readFileSync(htmlPath, "utf-8");
  const document = new JSDOM(rawHtml.toString()).window.document;
  const htmlEl = document.querySelector("html");
  const bodyEl = document.querySelector("body");
  const dataWfPage = htmlEl.getAttribute("data-wf-page");
  const dataWfSite = htmlEl.getAttribute("data-wf-site");

  const fontsHandler = () => {
    const scriptsEls = document.querySelectorAll("script");
    const scriptsToPrint = [...scriptsEls].filter(
      (el) =>
        el.innerHTML.includes("WebFont.load(") ||
        el.src.includes("https://ajax.googleapis.com/ajax/libs/webfont/") ||
        el.innerHTML.includes("Typekit.load(") ||
        el.src.includes("https://use.typekit.net/")

    );
    scriptsToPrint.forEach((el) => {
      bodyEl.appendChild(el);
    });
  };

  const assetsHandler = () => {
    const srcAttr = ["src", "data-src", "data-poster-url", "data-video-urls"];
    const srcsetEls = bodyEl.querySelectorAll("[srcset]");

    srcAttr.forEach((attr) => {
      const srcEls = bodyEl.querySelectorAll(`[${attr}]`);
      [...srcEls].forEach((srcEl) => {
        const src = srcEl.getAttribute(`${attr}`);
        const isExternalUrl = externalUrlRgx.test(src);
        if (!isExternalUrl) {
          srcEl.setAttribute(`${attr}`, `${assestsUrl}${src}`);
        }
      });
    });

    [...srcsetEls].forEach((srcsetEl) => {
      const srcsets = srcsetEl.getAttribute("srcset").split(", ");

      srcsets.forEach((srcset, i) => {
        srcset = srcset.split(" ");
        const isExternalUrl = externalUrlRgx.test(srcset[0]);

        if (!isExternalUrl) {
          srcset[0] = `${assestsUrl}${srcset[0]}`;
        }

        srcsets[i] = srcset.join(" ");
      });

      srcsetEl.setAttribute("srcset", `${srcsets.join(", ")}`);
    });
  };

  const scriptsHandler = () => {
    const jsScriptEls = bodyEl.querySelectorAll("script");
    // Webflow JS need this data attributes in the <html>
    bodyEl.insertAdjacentHTML(
      "afterbegin",
      `
      <script>
          htmlEl = document.querySelector("html");
          htmlEl.setAttribute("data-wf-page", "${dataWfPage}");
          htmlEl.setAttribute("data-wf-site", "${dataWfSite}");
      </script>
      `
    );

    jsScriptEls.forEach((el) => {
      const src = el.getAttribute("src");
      if (src) {
        const isExternalUrl = externalUrlRgx.test(src);

        if (!isExternalUrl) {
          el.setAttribute("src", `${assestsUrl}${src}`);
        }
      }
    });
  };

  fontsHandler();
  assetsHandler();
  scriptsHandler();
  const contentToPrint = bodyEl.innerHTML;
  return contentToPrint;
};

module.exports = webflowHtmlParser;
