export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      ["feat", "fix", "chore", "docs", "refactor", "style", "test", "ci", "build", "revert"],
    ],
    "subject-case": [2, "always", "sentence-case"],
    "subject-max-length": [2, "always", 100],
  },
};