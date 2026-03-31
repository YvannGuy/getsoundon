/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Répertoires de tests
  testMatch: [
    '**/lib/event-assistant/__tests__/**/*.test.ts'
  ],
  
  // Extensions de fichiers à traiter
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Transform des fichiers TypeScript (nouvelle syntaxe)
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: false,
      tsconfig: {
        module: 'commonjs',
        target: 'es2020',
        lib: ['es2020'],
        allowJs: true,
        skipLibCheck: true,
        strict: false,
        forceConsistentCasingInFileNames: true,
        noEmit: true,
        esModuleInterop: true,
        moduleResolution: 'node',
        allowSyntheticDefaultImports: true,
        resolveJsonModule: true,
        isolatedModules: true,
        incremental: true
      }
    }]
  },
  
  // Résolution des modules (alias Next.js)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  
  // Répertoires à ignorer
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/'
  ],
  
  // Collecte de couverture
  collectCoverageFrom: [
    'lib/event-assistant/**/*.ts',
    '!lib/event-assistant/**/*.d.ts',
    '!lib/event-assistant/__tests__/**'
  ],
  
  // Seuils de couverture (assouplis pour commencer)
  coverageThreshold: {
    global: {
      branches: 40,
      functions: 40,
      lines: 50,
      statements: 50
    }
  },
  
  // Timeout des tests (30s pour conversation complètes)
  testTimeout: 30000,
  
  // Setup initial si nécessaire
  setupFilesAfterEnv: [],
  
  // Mode verbose pour debug
  verbose: true,
  
  // Ignorer les warnings TS sur certains packages
  testEnvironmentOptions: {
    url: 'http://localhost'
  }
};

module.exports = config;