import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Heavy vendor dependencies
          'pdf-vendor': ['pdfjs-dist', 'react-pdf'],
          'chart-vendor': ['chart.js', 'react-chartjs-2'],
          'anthropic-vendor': ['@anthropic-ai/sdk'],

          // Core React dependencies
          'react-vendor': ['react', 'react-dom'],
          'router-vendor': ['react-router-dom'],

          // Utility libraries
          'utils-vendor': ['axios', 'jwt-decode'],

          // React Markdown (can be heavy)
          'markdown-vendor': ['react-markdown'],

          // App-specific chunks
          'pages-admin': [
            './src/pages/AdminPage.jsx',
            './src/pages/AdminFieldsPage.jsx',
            './src/pages/AdminCompaniesPage.jsx',
            './src/pages/AdminRecycleBinPage.jsx',
            './src/pages/AdminUsersPage.jsx',
            './src/pages/AdminBillingSettingsPage.jsx',
            './src/pages/AdminInvoicingPage.jsx'
          ],
          'pages-finance': [
            './src/pages/PaymentsPage.jsx',
            './src/pages/CommissionsPage.jsx',
            './src/pages/ReportingPage.jsx'
          ],
          'pages-core': [
            './src/pages/DashboardPage.jsx',
            './src/pages/ApplicationsPage.jsx',
            './src/pages/CustomersPage.jsx',
            './src/pages/NotificationsPage.jsx'
          ]
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
