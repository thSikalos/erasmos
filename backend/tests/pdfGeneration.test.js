/**
 * Comprehensive tests for PDF generation functionality
 */

const request = require('supertest');
const path = require('path');
const fs = require('fs').promises;
const app = require('../src/app');
const pool = require('../src/config/db');
const pdfGenerationService = require('../src/services/pdfGenerationService');
const pdfAnalysisService = require('../src/services/pdfAnalysisService');
const mappingEngine = require('../src/services/mappingEngine');

describe('PDF Generation System', () => {
    let authToken;
    let testCompanyId;
    let testFieldId;
    let testTemplateId;
    let testApplicationId;

    beforeAll(async () => {
        // Setup test data
        await setupTestData();
    });

    afterAll(async () => {
        // Cleanup test data
        await cleanupTestData();
    });

    describe('PDF Template Management', () => {
        test('should upload and analyze PDF template', async () => {
            const testPDFPath = path.join(__dirname, 'fixtures', 'sample-template.pdf');

            // Create a simple test PDF if it doesn't exist
            await createTestPDF(testPDFPath);

            const response = await request(app)
                .post('/api/pdf-templates')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('pdfFile', testPDFPath)
                .field('companyId', testCompanyId)
                .field('fieldId', testFieldId)
                .field('optionValue', 'test-option')
                .field('templateName', 'Test Template')
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.template).toBeDefined();
            expect(response.body.template.template_name).toBe('Test Template');

            testTemplateId = response.body.template.id;
        });

        test('should reject invalid PDF files', async () => {
            const invalidFilePath = path.join(__dirname, 'fixtures', 'invalid.txt');
            await fs.writeFile(invalidFilePath, 'This is not a PDF');

            const response = await request(app)
                .post('/api/pdf-templates')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('pdfFile', invalidFilePath)
                .field('companyId', testCompanyId)
                .field('fieldId', testFieldId)
                .field('optionValue', 'test-option')
                .field('templateName', 'Invalid Template')
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('PDF');
        });

        test('should analyze PDF and extract placeholders', async () => {
            const response = await request(app)
                .post(`/api/pdf-templates/${testTemplateId}/analyze`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.analysis).toBeDefined();
            expect(Array.isArray(response.body.analysis.placeholders)).toBe(true);
        });
    });

    describe('Field Mapping', () => {
        test('should get mapping suggestions', async () => {
            const response = await request(app)
                .get(`/api/pdf-templates/${testTemplateId}/mapping-suggestions`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.suggestions)).toBe(true);
        });

        test('should save field mappings', async () => {
            const mappings = [
                {
                    placeholder: 'ΟΝΟΜΑ_ΠΕΛΑΤΗ',
                    targetFieldId: testFieldId,
                    isRequired: true,
                    coordinates: { x: 100, y: 200, width: 150, height: 20 }
                }
            ];

            const response = await request(app)
                .post(`/api/pdf-templates/${testTemplateId}/mappings`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ mappings })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.saved).toBe(1);
        });

        test('should validate mapping completeness', async () => {
            const fieldValues = {
                [testFieldId]: 'Test Value'
            };

            const response = await request(app)
                .post(`/api/pdf-templates/${testTemplateId}/validate-mappings`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ fieldValues })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.validation).toBeDefined();
        });
    });

    describe('PDF Generation', () => {
        test('should generate PDF from template and field values', async () => {
            const generationData = {
                templateId: testTemplateId,
                fieldValues: {
                    [testFieldId]: 'Test Customer Name'
                },
                customerDetails: {
                    full_name: 'Τεστ Πελάτης',
                    phone: '2101234567',
                    address: 'Τεστ Διεύθυνση 123',
                    afm: '123456789'
                },
                companyId: testCompanyId,
                contractEndDate: '2024-12-31'
            };

            const response = await request(app)
                .post('/api/applications/generate-pdf')
                .set('Authorization', `Bearer ${authToken}`)
                .send(generationData)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.downloadUrl).toBeDefined();
            expect(response.body.filename).toBeDefined();
            expect(response.body.metadata).toBeDefined();
        });

        test('should fail generation with missing required fields', async () => {
            const generationData = {
                templateId: testTemplateId,
                fieldValues: {}, // Empty field values
                customerDetails: {
                    full_name: 'Τεστ Πελάτης'
                },
                companyId: testCompanyId
            };

            const response = await request(app)
                .post('/api/applications/generate-pdf')
                .set('Authorization', `Bearer ${authToken}`)
                .send(generationData)
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toContain('required');
        });

        test('should check PDF readiness for application', async () => {
            const response = await request(app)
                .get(`/api/applications/${testApplicationId}/pdf-readiness`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body).toBeDefined();
            expect(typeof response.body.isReady).toBe('boolean');
        });
    });

    describe('Signed PDF Upload', () => {
        test('should upload signed PDF for application', async () => {
            const testPDFPath = path.join(__dirname, 'fixtures', 'signed-test.pdf');
            await createTestPDF(testPDFPath);

            const response = await request(app)
                .post(`/api/applications/${testApplicationId}/upload-signed`)
                .set('Authorization', `Bearer ${authToken}`)
                .attach('signedPDF', testPDFPath)
                .expect(200);

            expect(response.body.success).toBe(true);
        });

        test('should reject non-PDF files for signed upload', async () => {
            const invalidFilePath = path.join(__dirname, 'fixtures', 'invalid-signed.txt');
            await fs.writeFile(invalidFilePath, 'Not a PDF');

            const response = await request(app)
                .post(`/api/applications/${testApplicationId}/upload-signed`)
                .set('Authorization', `Bearer ${authToken}`)
                .attach('signedPDF', invalidFilePath)
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('Service Layer Tests', () => {
        describe('PDFAnalysisService', () => {
            test('should extract text from PDF', async () => {
                const testPDFPath = path.join(__dirname, 'fixtures', 'sample-template.pdf');
                const pdfBuffer = await fs.readFile(testPDFPath);

                const analysis = await pdfAnalysisService.analyzePDF(pdfBuffer);

                expect(analysis).toBeDefined();
                expect(analysis.text).toBeDefined();
                expect(Array.isArray(analysis.placeholders)).toBe(true);
            });

            test('should detect Greek placeholders', async () => {
                const mockText = 'ΟΝΟΜΑ: _______ ΤΗΛΕΦΩΝΟ: _______ ΔΙΕΥΘΥΝΣΗ: _______';
                const placeholders = pdfAnalysisService.extractPlaceholders(mockText);

                expect(placeholders.length).toBeGreaterThan(0);
                expect(placeholders.some(p => p.content.includes('ΟΝΟΜΑ'))).toBe(true);
            });
        });

        describe('MappingEngine', () => {
            test('should generate intelligent mapping suggestions', async () => {
                const placeholders = [
                    { content: 'ΟΝΟΜΑ_ΠΕΛΑΤΗ', confidence: 0.9 },
                    { content: 'ΤΗΛΕΦΩΝΟ', confidence: 0.8 }
                ];

                const fields = [
                    { id: 1, label: 'Όνομα Πελάτη', type: 'text' },
                    { id: 2, label: 'Τηλέφωνο', type: 'text' }
                ];

                const suggestions = await mappingEngine.generateMappingSuggestions(
                    placeholders,
                    fields,
                    testCompanyId
                );

                expect(Array.isArray(suggestions)).toBe(true);
                expect(suggestions.length).toBeGreaterThan(0);
                expect(suggestions[0]).toHaveProperty('confidence');
            });
        });

        describe('PDFGenerationService', () => {
            test('should validate required fields', async () => {
                const validation = await pdfGenerationService.validateRequiredFields(
                    testTemplateId,
                    { [testFieldId]: 'Test Value' }
                );

                expect(validation).toBeDefined();
                expect(typeof validation.isValid).toBe('boolean');
            });

            test('should generate unique filenames', () => {
                const template = {
                    template_name: 'Test Template'
                };

                const customerDetails = {
                    full_name: 'Τεστ Πελάτης'
                };

                const filename1 = pdfGenerationService.generateOutputFilename(template, customerDetails);
                const filename2 = pdfGenerationService.generateOutputFilename(template, customerDetails);

                expect(filename1).not.toBe(filename2);
                expect(filename1.endsWith('.pdf')).toBe(true);
            });
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid template ID gracefully', async () => {
            const response = await request(app)
                .post('/api/applications/generate-pdf')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    templateId: 99999, // Non-existent template
                    fieldValues: {},
                    customerDetails: {}
                })
                .expect(404);

            expect(response.body.success).toBe(false);
            expect(response.body.message).toBeDefined();
        });

        test('should handle corrupted PDF files', async () => {
            const corruptedPDFPath = path.join(__dirname, 'fixtures', 'corrupted.pdf');
            await fs.writeFile(corruptedPDFPath, 'This is not a valid PDF content');

            const response = await request(app)
                .post('/api/pdf-templates')
                .set('Authorization', `Bearer ${authToken}`)
                .attach('pdfFile', corruptedPDFPath)
                .field('companyId', testCompanyId)
                .field('fieldId', testFieldId)
                .field('optionValue', 'test-option')
                .field('templateName', 'Corrupted Template')
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        test('should handle database connection errors', async () => {
            // Mock database error
            const originalQuery = pool.query;
            pool.query = jest.fn().mockRejectedValue(new Error('Database connection failed'));

            const response = await request(app)
                .get('/api/pdf-templates')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(500);

            expect(response.body.success).toBe(false);

            // Restore original function
            pool.query = originalQuery;
        });
    });

    describe('Performance Tests', () => {
        test('should generate PDF within acceptable time limit', async () => {
            const startTime = Date.now();

            const generationData = {
                templateId: testTemplateId,
                fieldValues: { [testFieldId]: 'Performance Test' },
                customerDetails: { full_name: 'Performance Test User' },
                companyId: testCompanyId
            };

            await request(app)
                .post('/api/applications/generate-pdf')
                .set('Authorization', `Bearer ${authToken}`)
                .send(generationData)
                .expect(200);

            const endTime = Date.now();
            const duration = endTime - startTime;

            // Should complete within 5 seconds
            expect(duration).toBeLessThan(5000);
        });

        test('should handle concurrent PDF generation requests', async () => {
            const requests = Array.from({ length: 3 }, (_, i) =>
                request(app)
                    .post('/api/applications/generate-pdf')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                        templateId: testTemplateId,
                        fieldValues: { [testFieldId]: `Concurrent Test ${i}` },
                        customerDetails: { full_name: `Concurrent User ${i}` },
                        companyId: testCompanyId
                    })
            );

            const responses = await Promise.all(requests);

            responses.forEach(response => {
                expect(response.status).toBe(200);
                expect(response.body.success).toBe(true);
            });
        });
    });
});

// Helper functions
async function setupTestData() {
    // Create test user and get auth token
    const userResponse = await request(app)
        .post('/api/auth/register')
        .send({
            username: 'pdftest@example.com',
            email: 'pdftest@example.com',
            password: 'TestPassword123!',
            full_name: 'PDF Test User',
            role: 'Admin'
        });

    const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
            email: 'pdftest@example.com',
            password: 'TestPassword123!'
        });

    authToken = loginResponse.body.token;

    // Create test company
    const companyResult = await pool.query(
        'INSERT INTO companies (name, is_active) VALUES ($1, $2) RETURNING id',
        ['PDF Test Company', true]
    );
    testCompanyId = companyResult.rows[0].id;

    // Create test field
    const fieldResult = await pool.query(
        'INSERT INTO fields (company_id, type, label, required) VALUES ($1, $2, $3, $4) RETURNING id',
        [testCompanyId, 'text', 'Test Field', true]
    );
    testFieldId = fieldResult.rows[0].id;

    // Create test application
    const appResult = await pool.query(
        'INSERT INTO applications (company_id, associate_id, status, total_commission) VALUES ($1, $2, $3, $4) RETURNING id',
        [testCompanyId, 1, 'Αποθήκευση', 0]
    );
    testApplicationId = appResult.rows[0].id;

    // Ensure test fixtures directory exists
    const fixturesDir = path.join(__dirname, 'fixtures');
    await fs.mkdir(fixturesDir, { recursive: true });
}

async function cleanupTestData() {
    // Clean up test data in reverse order of creation
    if (testApplicationId) {
        await pool.query('DELETE FROM applications WHERE id = $1', [testApplicationId]);
    }

    if (testTemplateId) {
        await pool.query('DELETE FROM pdf_templates WHERE id = $1', [testTemplateId]);
    }

    if (testFieldId) {
        await pool.query('DELETE FROM fields WHERE id = $1', [testFieldId]);
    }

    if (testCompanyId) {
        await pool.query('DELETE FROM companies WHERE id = $1', [testCompanyId]);
    }

    // Clean up test user
    await pool.query('DELETE FROM users WHERE email = $1', ['pdftest@example.com']);

    // Clean up test files
    const fixturesDir = path.join(__dirname, 'fixtures');
    try {
        const files = await fs.readdir(fixturesDir);
        await Promise.all(files.map(file => fs.unlink(path.join(fixturesDir, file))));
        await fs.rmdir(fixturesDir);
    } catch (error) {
        // Directory might not exist or be empty
    }
}

async function createTestPDF(filePath) {
    // Create a minimal PDF for testing
    const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    page.drawText('Test PDF Template', {
        x: 50,
        y: 750,
        size: 20,
        font: font,
        color: rgb(0, 0, 0),
    });

    page.drawText('ΟΝΟΜΑ: _____________', {
        x: 50,
        y: 700,
        size: 12,
        font: font,
        color: rgb(0, 0, 0),
    });

    page.drawText('ΤΗΛΕΦΩΝΟ: _____________', {
        x: 50,
        y: 670,
        size: 12,
        font: font,
        color: rgb(0, 0, 0),
    });

    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(filePath, pdfBytes);
}