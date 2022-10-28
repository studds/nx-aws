const { getJestProjects } = require('@nrwl/jest');

export default {
    projects: [
        ...getJestProjects(),
        '<rootDir>/e2e/sam-e2e',
        '<rootDir>/e2e/core-e2e',
        '<rootDir>/e2e/s3-e2e',
    ],
};
