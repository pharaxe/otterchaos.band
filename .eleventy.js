import postcssPlugin from "@jgarber/eleventy-plugin-postcss";
import htmlminifier from "html-minifier-terser";
import { EleventyHtmlBasePlugin } from "@11ty/eleventy";
import Image from "@11ty/eleventy-img";

const IS_PROD_BUILD = process.env.NODE_ENV === "production";

async function imageShortcode(
  src,
  alt,
  sizes = "100vh",
  widths = [600, 900, 1500]
) {
  const metadata = await Image(src, {
    widths,
    formats: ["avif", "webp", "png"],
    outputDir: "./public/img/",
  });

  const imageAttributes = {
    alt,
    sizes,
    loading: "lazy",
    decoding: "async",
  };

  // You bet we throw an error on missing alt in `imageAttributes` (alt="" works okay)
  return Image.generateHTML(metadata, imageAttributes);
}

export default function (eleventyConfig) {
  eleventyConfig.addWatchTarget("./src/css/");
  eleventyConfig.addAsyncShortcode("image", imageShortcode);
  eleventyConfig.addPassthroughCopy({ "./src/img/favicon": "/" });
  eleventyConfig.addPassthroughCopy({ "./src/static": "/" });
  eleventyConfig.addPassthroughCopy("./CNAME");
  eleventyConfig.addPlugin(EleventyHtmlBasePlugin);
  eleventyConfig.addPlugin(postcssPlugin);

  /*
  eleventyConfig.addTransform("htmlminifier", (content, outputPath) => {
    if (!outputPath.endsWith(".html")) return content;

    return htmlminifier.minify(
      content,
      IS_PROD_BUILD
        ? {
            useShortDoctype: true,
            collapseWhitespace: true,
            removeComments: true,
            removeEmptyElements: true,
            removeRedundantAttributes: true,
          }
        : {
            useShortDoctype: true,
            collapseWhitespace: true,
            maxLineLength: 120,
            preserveLineBreaks: true,
            removeEmptyElements: true,
            removeRedundantAttributes: true,
          }
    );
  });
  */

  eleventyConfig.addGlobalData("currentYear", new Date().getFullYear());

  /**
   * No-code icons, using Iconify api
   * @docs https://iconify.design/docs/usage/css/no-code/
   * @docs https://icon-sets.iconify.design/?keyword=ion
   *
   * 1. default theme is "ion", change it to any other theme at icon-sets.iconify.design
   * 2. explictly list the icons you want to use. this helps save bandwidth and forces you to be intentional about which icons are loaded
   *
   * @example <tree-icon name="logo-youtube"></tree-icon
   * @see src/_components/tree-icon.webc
   */
  eleventyConfig.addGlobalData("icon", {
    theme: "fa6-brands",
    list: ["youtube", "twitter", "bluesky"],
    get url() {
      const iconListParam = encodeURIComponent(this.list.join(","));
      return `https://api.iconify.design/${this.theme}.css?icons=${iconListParam}`;
    },
  });

  return {
    dir: {
      input: "src",
      output: "public",
    },
  };
}
