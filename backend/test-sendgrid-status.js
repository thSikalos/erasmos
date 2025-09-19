#!/usr/bin/env node

/**
 * SendGrid API Key and Account Status Checker
 * Tests if the API key is valid and has proper permissions
 */

require('dotenv').config();
const sgMail = require('@sendgrid/mail');

async function testSendGridStatus() {
    console.log('🔍 SENDGRID ACCOUNT STATUS CHECK');
    console.log('=================================');

    const apiKey = process.env.SENDGRID_API_KEY;

    if (!apiKey) {
        console.log('❌ No SendGrid API key found in environment');
        return;
    }

    console.log(`✅ API Key found: ${apiKey.substring(0, 10)}...`);

    sgMail.setApiKey(apiKey);

    try {
        // Test 1: Check API key validity with a simple request
        console.log('\n🧪 TEST 1: API Key Validity');
        console.log('----------------------------');

        // Use SendGrid's API to check account status
        const https = require('https');
        const testApiCall = () => {
            return new Promise((resolve, reject) => {
                const options = {
                    hostname: 'api.sendgrid.com',
                    port: 443,
                    path: '/v3/user/profile',
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                };

                const req = https.request(options, (res) => {
                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => {
                        resolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            data: data
                        });
                    });
                });

                req.on('error', reject);
                req.end();
            });
        };

        const profileResponse = await testApiCall();

        if (profileResponse.statusCode === 200) {
            console.log('✅ API Key is valid');
            const profile = JSON.parse(profileResponse.data);
            console.log(`   Account: ${profile.username}`);
            console.log(`   Email: ${profile.email}`);
        } else {
            console.log(`❌ API Key issue - Status: ${profileResponse.statusCode}`);
            console.log(`   Response: ${profileResponse.data}`);
        }

        // Test 2: Check sender identities
        console.log('\n🧪 TEST 2: Verified Sender Identities');
        console.log('--------------------------------------');

        const checkSenders = () => {
            return new Promise((resolve, reject) => {
                const options = {
                    hostname: 'api.sendgrid.com',
                    port: 443,
                    path: '/v3/verified_senders',
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                };

                const req = https.request(options, (res) => {
                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => {
                        resolve({
                            statusCode: res.statusCode,
                            data: data
                        });
                    });
                });

                req.on('error', reject);
                req.end();
            });
        };

        const sendersResponse = await checkSenders();

        if (sendersResponse.statusCode === 200) {
            const senders = JSON.parse(sendersResponse.data);
            console.log(`✅ Found ${senders.results?.length || 0} verified senders:`);

            if (senders.results && senders.results.length > 0) {
                senders.results.forEach((sender, index) => {
                    console.log(`   ${index + 1}. ${sender.from_email} (${sender.verified ? '✅ Verified' : '❌ Not Verified'})`);
                });
            } else {
                console.log('   ⚠️  No verified senders found!');
            }
        } else {
            console.log(`❌ Could not retrieve senders - Status: ${sendersResponse.statusCode}`);
            console.log(`   Response: ${sendersResponse.data}`);
        }

        // Test 3: Check domain authentication
        console.log('\n🧪 TEST 3: Domain Authentication');
        console.log('---------------------------------');

        const checkDomains = () => {
            return new Promise((resolve, reject) => {
                const options = {
                    hostname: 'api.sendgrid.com',
                    port: 443,
                    path: '/v3/whitelabel/domains',
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                };

                const req = https.request(options, (res) => {
                    let data = '';
                    res.on('data', (chunk) => data += chunk);
                    res.on('end', () => {
                        resolve({
                            statusCode: res.statusCode,
                            data: data
                        });
                    });
                });

                req.on('error', reject);
                req.end();
            });
        };

        const domainsResponse = await checkDomains();

        if (domainsResponse.statusCode === 200) {
            const domains = JSON.parse(domainsResponse.data);
            console.log(`✅ Found ${domains.length || 0} authenticated domains:`);

            if (domains.length > 0) {
                domains.forEach((domain, index) => {
                    console.log(`   ${index + 1}. ${domain.domain} (${domain.valid ? '✅ Valid' : '❌ Invalid'})`);
                    if (domain.domain === 'erasmos.gr') {
                        console.log(`      🎯 erasmos.gr found - Valid: ${domain.valid}`);
                    }
                });
            } else {
                console.log('   ⚠️  No authenticated domains found!');
            }
        } else {
            console.log(`❌ Could not retrieve domains - Status: ${domainsResponse.statusCode}`);
            console.log(`   Response: ${domainsResponse.data}`);
        }

    } catch (error) {
        console.error('💥 Test failed:', error.message);
        console.error('Stack:', error.stack);
    }

    console.log('\n🏁 SendGrid Status Check Complete');
}

// Run the test
testSendGridStatus().catch(error => {
    console.error('💥 Status check failed:', error);
    process.exit(1);
});