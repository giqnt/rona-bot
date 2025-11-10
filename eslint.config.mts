import { createConfig } from "@giqnt/eslint-config";

export default createConfig({
    rootDir: __dirname,
    overrides: {
        // "@typescript-eslint/explicit-function-return-type": "error",
        "@typescript-eslint/explicit-member-accessibility": "error",
        "@typescript-eslint/strict-boolean-expressions": ["error", {
            allowNullableObject: false,
        }],
        "@typescript-eslint/prefer-optional-chain": "off",
    },
});
