// Brand Configuration για Enterprise Document Generation
// Συνάφεια με το frontend UI theme

const BRAND_CONFIG = {
    // Colors matching frontend theme
    colors: {
        primary: '#667eea',
        secondary: '#764ba2', 
        accent: '#28a745',
        success: '#28a745',
        warning: '#ffc107',
        danger: '#dc3545',
        light: '#f8f9fa',
        dark: '#343a40',
        white: '#ffffff',
        gradientStart: '#667eea',
        gradientEnd: '#764ba2'
    },

    // Typography
    fonts: {
        primary: 'Roboto',
        bold: 'Roboto-Bold',
        light: 'Roboto-Light'
    },

    // Platform identity
    platform: {
        name: 'erasmos.app',
        website: 'https://erasmos.app',
        tagline: 'Business Management Platform',
        logo: null // To be added if needed
    },

    // Document styling constants
    styling: {
        headerHeight: 80,
        footerHeight: 40,
        margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50
        },
        borderRadius: 8,
        shadowOpacity: 0.1
    },

    // Greek localization
    locale: {
        language: 'el-GR',
        currency: 'EUR',
        currencySymbol: '€',
        dateFormat: 'dd/MM/yyyy',
        timeFormat: 'HH:mm'
    }
};

module.exports = BRAND_CONFIG;