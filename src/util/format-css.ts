export const formatCSS = (css: string) => ({
  extractCSS(content: string, nested: boolean = false) {
    const propValueRegex = /(?:[\s\r\n]*)?(?<prop>[\w-]+)\s*:\s*(?<value>[^;\r\n]+)/gm;
    let match: RegExpExecArray | null;
    const props: { [key: string]: string | undefined } = {};

    while ((match = propValueRegex.exec(content)) !== null) {
      const { prop, value } = match.groups!;
      props[prop] = value;
    }

    return Object.entries(props).reduce(
      (acc, [prop, value]) => acc + `${nested ? "\t" : ""}${prop}: ${value}; \n\r`,
      ""
    );
  },
  merge() {
    let mediaQueries = '';
    const mediaRegex = /(?<media>@(media|container)\s*\([^\)]*\))\s*\{(?<content>[^\}]*)\}/gm;
    let matchMedia: RegExpExecArray | null;
    while ((matchMedia = mediaRegex.exec(css)) !== null) {
      const { media, content } = matchMedia.groups!;
      mediaQueries += `\n\r${media} {\n\r${this.extractCSS(content, true)}}\n\r`;
    }
    const cssWithoutMediaQueries = css.replace(mediaRegex, '');

    const blockContentRegex = /(?<=\.)[^{]+\s*\{(?<content>[^{}]*(?:(?<=;)\s*\n\r?[^{}]*)*)\s*\}/gm;
    let matchBlock: RegExpExecArray | null;
    let blockContent = "";

    while ((matchBlock = blockContentRegex.exec(cssWithoutMediaQueries)) !== null) {
      const { content } = matchBlock.groups!;
      blockContent += content;
    }

    css = this.extractCSS(blockContent) + mediaQueries;

    return this;
  },
  removeUndefined() {
    const undefinedPropRegex =
      /^[^{}]*(?:[.#][a-zA-Z0-9_-]+)[^{]*{[^}]*\b(?:[a-z-]+):\s*undefined\s*;?[^}]*}/gm;
    css = css.replace(undefinedPropRegex, "");

    return this;
  },
  combineMediaQueries() {
    const regex = new RegExp(
      "@(media|container)\\s*(?<conditions>\\([^)]+\\))\\s*{(?<content>(?:[^{}]+|{(?:[^{}]+|{[^{}]*})*})+)}",
      "gs"
    );

    const medias = new Map<string, string>();

    const cleanCSS = (cssText: string) =>
      cssText.replace(regex, (_, queryType, conditions, content) => {
        const mediaContent = medias.get(`${queryType}${conditions}`) ?? "";
        medias.set(
          `${queryType}${conditions}`,
          mediaContent + cleanCSS(content),
        );
        cleanCSS(content);
        return "";
      });

    const parts = [];
    parts.push(cleanCSS(css));
    parts.push(
      ...Array.from(
        medias,
        ([condition, content]) => `@${condition}{\n\r${content}\n\r}\n\r`,
      ),
    );

    css = parts.join("");

    return this;
  },
  minify() {
    css = css

      // Remove comments
      .replace(/\/\*[\s\S]*?\*\//gm, "")

      // Remove extra spaces after semicolons and colons
      .replace(/;\s+/gm, ";")
      .replace(/:\s+/gm, ":")

      // Remove extra spaces before and after brackets
      .replace(/\)\s*{/gm, "){") // Remove spaces before opening curly brace after closing parenthesis
      .replace(/\s+\(/gm, "(") // Remove spaces before opening parenthesis
      .replace(/{\s+/gm, "{") // Remove spaces after opening curly brace
      .replace(/}\s+/gm, "}") // Remove spaces before closing curly brace
      .replace(/\s*{/gm, "{") // Remove spaces after opening curly brace
      .replace(/;?\s*}/gm, "}"); // Remove extra spaces and semicolons before closing curly braces

    return this;
  },
  fixRGB() {
    const regex =
      /rgb\(\s*(?<red>\d+)\s*(?<green>\d+)\s*(?<blue>\d+)(?:\s*\/\s*(?<alpha>[\d%.]+))?\s*\)/gm;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(css)) !== null) {
      const [matchString] = match;
      let { red, green, blue, alpha = 1 } = match.groups!;
      css = css.replace(
        matchString,
        `rgb(${red},${green},${blue}${alpha === "1" ? "" : `,${alpha}`})`
      );
    }

    return this;
  },
  removeMediaQueries() {
    css = css.replace(/@(media|container)[^\{]+\{[^@]+\}/g, "");

    return this;
  },
  get() {
    return css;
  },
});
