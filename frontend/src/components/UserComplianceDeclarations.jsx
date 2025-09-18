import React, { useState } from 'react';

const UserComplianceDeclarations = ({ onDeclarationsChange, initialValues = {} }) => {
  const [declarations, setDeclarations] = useState({
    hasLegalAuthority: initialValues.hasLegalAuthority || false,
    hasObtainedConsents: initialValues.hasObtainedConsents || false,
    hasInformedDataSubjects: initialValues.hasInformedDataSubjects || false,
    dataIsAccurate: initialValues.dataIsAccurate || false,
    acceptsLiability: initialValues.acceptsLiability || false,
    understandsObligations: initialValues.understandsObligations || false,
    acceptsBilling: initialValues.acceptsBilling || false
  });

  const handleDeclarationChange = (key, value) => {
    const newDeclarations = {
      ...declarations,
      [key]: value
    };

    setDeclarations(newDeclarations);

    if (onDeclarationsChange) {
      onDeclarationsChange(newDeclarations);
    }
  };

  const allDeclarationsAccepted = Object.values(declarations).every(Boolean);

  return (
    <div className="user-compliance-declarations">
      <style>
        {`
          .declarations-container {
            padding: 24px;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          }

          .declarations-header {
            margin-bottom: 24px;
            text-align: center;
          }

          .declarations-title {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1f2937;
            margin: 0 0 8px 0;
          }

          .declarations-subtitle {
            color: #6b7280;
            font-size: 0.9rem;
            line-height: 1.5;
          }

          .declaration-item {
            margin-bottom: 20px;
            padding: 20px;
            border: 2px solid #e5e7eb;
            border-radius: 12px;
            transition: all 0.3s ease;
            position: relative;
          }

          .declaration-item.accepted {
            border-color: #10b981;
            background: #f0fdf4;
          }

          .declaration-item.critical {
            border-color: #dc2626;
            background: #fef2f2;
          }

          .declaration-item.critical.accepted {
            border-color: #10b981;
            background: #f0fdf4;
          }

          .declaration-checkbox-container {
            display: flex;
            align-items: flex-start;
            gap: 12px;
          }

          .declaration-checkbox {
            width: 20px;
            height: 20px;
            margin-top: 2px;
            cursor: pointer;
            accent-color: #10b981;
          }

          .declaration-content {
            flex: 1;
          }

          .declaration-text {
            font-weight: 600;
            color: #374151;
            margin: 0 0 8px 0;
            line-height: 1.4;
          }

          .declaration-description {
            color: #6b7280;
            font-size: 0.85rem;
            line-height: 1.4;
            margin: 0;
          }

          .critical-warning {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            color: #dc2626;
            font-weight: 700;
            font-size: 0.8rem;
            margin-bottom: 8px;
          }

          .billing-notice {
            background: #fef3c7;
            border: 1px solid #f59e0b;
            border-radius: 8px;
            padding: 16px;
            margin: 24px 0;
          }

          .billing-notice-title {
            font-weight: 600;
            color: #92400e;
            margin: 0 0 8px 0;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .billing-notice-text {
            color: #78350f;
            font-size: 0.9rem;
            margin: 0;
            line-height: 1.4;
          }

          .compliance-summary {
            margin-top: 24px;
            padding: 16px;
            border-radius: 12px;
            text-align: center;
            border: 2px solid;
          }

          .compliance-summary.complete {
            background: #f0fdf4;
            border-color: #10b981;
            color: #065f46;
          }

          .compliance-summary.incomplete {
            background: #fef2f2;
            border-color: #ef4444;
            color: #991b1b;
          }

          .required-badge {
            display: inline-block;
            background: #dc2626;
            color: white;
            font-size: 0.7rem;
            font-weight: 600;
            padding: 2px 6px;
            border-radius: 4px;
            margin-left: 8px;
          }

          .gdpr-icon {
            font-size: 1.2rem;
            margin-right: 4px;
          }
        `}
      </style>

      <div className="declarations-container">
        <div className="declarations-header">
          <h2 className="declarations-title">
            📋 Δηλώσεις Συμμόρφωσης Χρήστη
          </h2>
          <p className="declarations-subtitle">
            Παρακαλούμε διαβάστε προσεκτικά και αποδεχθείτε τις παρακάτω δηλώσεις.
            Όλες οι δηλώσεις είναι υποχρεωτικές για τη χρήση της υπηρεσίας.
          </p>
        </div>

        {/* Legal Authority Declaration */}
        <div className={`declaration-item critical ${declarations.hasLegalAuthority ? 'accepted' : ''}`}>
          {!declarations.hasLegalAuthority && (
            <div className="critical-warning">
              ⚠️ ΚΡΙΣΙΜΗ ΔΗΛΩΣΗ - ΑΠΑΙΤΕΙΤΑΙ
            </div>
          )}
          <div className="declaration-checkbox-container">
            <input
              type="checkbox"
              className="declaration-checkbox"
              checked={declarations.hasLegalAuthority}
              onChange={(e) => handleDeclarationChange('hasLegalAuthority', e.target.checked)}
              id="hasLegalAuthority"
            />
            <div className="declaration-content">
              <label htmlFor="hasLegalAuthority" className="declaration-text">
                🏛️ Δήλωση Νομικής Εξουσιοδότησης
                <span className="required-badge">ΑΠΑΙΤΕΙΤΑΙ</span>
              </label>
              <p className="declaration-description">
                Δηλώνω ότι έχω την νομική εξουσιοδότηση και το δικαίωμα να επεξεργάζομαι
                όλα τα προσωπικά δεδομένα που θα εισάγω στην πλατφόρμα Erasmos.
                Αναλαμβάνω την πλήρη ευθύνη για τη νομιμότητα της επεξεργασίας.
              </p>
            </div>
          </div>
        </div>

        {/* GDPR Consents Declaration */}
        <div className={`declaration-item critical ${declarations.hasObtainedConsents ? 'accepted' : ''}`}>
          {!declarations.hasObtainedConsents && (
            <div className="critical-warning">
              ⚠️ GDPR ΣΥΜΜΟΡΦΩΣΗ - ΑΠΑΙΤΕΙΤΑΙ
            </div>
          )}
          <div className="declaration-checkbox-container">
            <input
              type="checkbox"
              className="declaration-checkbox"
              checked={declarations.hasObtainedConsents}
              onChange={(e) => handleDeclarationChange('hasObtainedConsents', e.target.checked)}
              id="hasObtainedConsents"
            />
            <div className="declaration-content">
              <label htmlFor="hasObtainedConsents" className="declaration-text">
                <span className="gdpr-icon">🇪🇺</span> Δήλωση GDPR Συναινέσεων
                <span className="required-badge">ΑΠΑΙΤΕΙΤΑΙ</span>
              </label>
              <p className="declaration-description">
                Δηλώνω ότι έχω λάβει όλες τις απαραίτητες συναινέσεις από τα υποκείμενα
                των προσωπικών δεδομένων σύμφωνα με το άρθρο 6 και 7 του GDPR.
                Οι συναινέσεις είναι ελεύθερες, συγκεκριμένες, ενημερωμένες και σαφείς.
              </p>
            </div>
          </div>
        </div>

        {/* Data Subject Information Declaration */}
        <div className={`declaration-item critical ${declarations.hasInformedDataSubjects ? 'accepted' : ''}`}>
          {!declarations.hasInformedDataSubjects && (
            <div className="critical-warning">
              ⚠️ ΕΝΗΜΕΡΩΣΗ ΥΠΟΚΕΙΜΕΝΩΝ - ΑΠΑΙΤΕΙΤΑΙ
            </div>
          )}
          <div className="declaration-checkbox-container">
            <input
              type="checkbox"
              className="declaration-checkbox"
              checked={declarations.hasInformedDataSubjects}
              onChange={(e) => handleDeclarationChange('hasInformedDataSubjects', e.target.checked)}
              id="hasInformedDataSubjects"
            />
            <div className="declaration-content">
              <label htmlFor="hasInformedDataSubjects" className="declaration-text">
                📢 Δήλωση Ενημέρωσης Υποκειμένων
                <span className="required-badge">ΑΠΑΙΤΕΙΤΑΙ</span>
              </label>
              <p className="declaration-description">
                Δηλώνω ότι έχω ενημερώσει πλήρως όλα τα υποκείμενα των προσωπικών δεδομένων
                σύμφωνα με τα άρθρα 13 και 14 του GDPR για τους σκοπούς επεξεργασίας,
                τα δικαιώματά τους και την ταυτότητα του εκτελούντος την επεξεργασία.
              </p>
            </div>
          </div>
        </div>

        {/* Data Accuracy Declaration */}
        <div className={`declaration-item ${declarations.dataIsAccurate ? 'accepted' : ''}`}>
          <div className="declaration-checkbox-container">
            <input
              type="checkbox"
              className="declaration-checkbox"
              checked={declarations.dataIsAccurate}
              onChange={(e) => handleDeclarationChange('dataIsAccurate', e.target.checked)}
              id="dataIsAccurate"
            />
            <div className="declaration-content">
              <label htmlFor="dataIsAccurate" className="declaration-text">
                ✅ Δήλωση Ακρίβειας Δεδομένων
                <span className="required-badge">ΑΠΑΙΤΕΙΤΑΙ</span>
              </label>
              <p className="declaration-description">
                Δηλώνω ότι όλα τα προσωπικά δεδομένα που θα εισάγω είναι ακριβή,
                ενημερωμένα και πλήρη. Αναλαμβάνω την υποχρέωση να τα διορθώνω
                όταν είναι απαραίτητο.
              </p>
            </div>
          </div>
        </div>

        {/* Liability Acceptance */}
        <div className={`declaration-item critical ${declarations.acceptsLiability ? 'accepted' : ''}`}>
          {!declarations.acceptsLiability && (
            <div className="critical-warning">
              ⚠️ ΑΠΟΔΟΧΗ ΕΥΘΥΝΗΣ - ΑΠΑΙΤΕΙΤΑΙ
            </div>
          )}
          <div className="declaration-checkbox-container">
            <input
              type="checkbox"
              className="declaration-checkbox"
              checked={declarations.acceptsLiability}
              onChange={(e) => handleDeclarationChange('acceptsLiability', e.target.checked)}
              id="acceptsLiability"
            />
            <div className="declaration-content">
              <label htmlFor="acceptsLiability" className="declaration-text">
                ⚖️ Αποδοχή Ευθύνης και Αποζημίωσης
                <span className="required-badge">ΑΠΑΙΤΕΙΤΑΙ</span>
              </label>
              <p className="declaration-description">
                Αποδέχομαι την πλήρη ευθύνη για τη χρήση της υπηρεσίας και αναλαμβάνω
                να αποζημιώσω τον πάροχο για τυχόν ζημίες που μπορεί να προκύψουν από
                παραβιάσεις GDPR, μη νόμιμη επεξεργασία δεδομένων ή άλλες παραβάσεις.
              </p>
            </div>
          </div>
        </div>

        {/* Understanding Obligations */}
        <div className={`declaration-item ${declarations.understandsObligations ? 'accepted' : ''}`}>
          <div className="declaration-checkbox-container">
            <input
              type="checkbox"
              className="declaration-checkbox"
              checked={declarations.understandsObligations}
              onChange={(e) => handleDeclarationChange('understandsObligations', e.target.checked)}
              id="understandsObligations"
            />
            <div className="declaration-content">
              <label htmlFor="understandsObligations" className="declaration-text">
                📚 Κατανόηση Υποχρεώσεων
                <span className="required-badge">ΑΠΑΙΤΕΙΤΑΙ</span>
              </label>
              <p className="declaration-description">
                Δηλώνω ότι κατανοώ πλήρως τις υποχρεώσεις μου ως Υπεύθυνος Επεξεργασίας
                σύμφωνα με το GDPR και την ελληνική νομοθεσία. Έχω διαβάσει και κατανοώ
                τους Όρους Χρήσης και τη Συμφωνία Επεξεργασίας Δεδομένων.
              </p>
            </div>
          </div>
        </div>

        {/* Billing Terms */}
        <div className="billing-notice">
          <h3 className="billing-notice-title">
            💳 Ειδοποίηση Χρεώσεων
          </h3>
          <p className="billing-notice-text">
            Η χρήση της υπηρεσίας συνεπάγεται χρεώσεις σύμφωνα με τον τιμοκατάλογο που ισχύει.
            Οι χρεώσεις περιλαμβάνουν ΦΠΑ και θα χρεώνεστε σύμφωνα με τη χρήση της υπηρεσίας.
          </p>
        </div>

        <div className={`declaration-item ${declarations.acceptsBilling ? 'accepted' : ''}`}>
          <div className="declaration-checkbox-container">
            <input
              type="checkbox"
              className="declaration-checkbox"
              checked={declarations.acceptsBilling}
              onChange={(e) => handleDeclarationChange('acceptsBilling', e.target.checked)}
              id="acceptsBilling"
            />
            <div className="declaration-content">
              <label htmlFor="acceptsBilling" className="declaration-text">
                💰 Αποδοχή Οικονομικών Όρων
                <span className="required-badge">ΑΠΑΙΤΕΙΤΑΙ</span>
              </label>
              <p className="declaration-description">
                Αποδέχομαι τους οικονομικούς όρους χρήσης της υπηρεσίας και τις χρεώσεις
                που θα προκύψουν από τη χρήση της πλατφόρμας σύμφωνα με τον ισχύοντα
                τιμοκατάλογο.
              </p>
            </div>
          </div>
        </div>

        {/* Compliance Summary */}
        <div className={`compliance-summary ${allDeclarationsAccepted ? 'complete' : 'incomplete'}`}>
          {allDeclarationsAccepted ? (
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>
                ✅ Όλες οι δηλώσεις έχουν γίνει αποδεκτές
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem' }}>
                Μπορείτε να προχωρήσετε στην ολοκλήρωση της νομικής αποδοχής
              </p>
            </div>
          ) : (
            <div>
              <p style={{ margin: 0, fontWeight: 600 }}>
                ❌ Απαιτούνται όλες οι δηλώσεις για τη συνέχιση
              </p>
              <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem' }}>
                Παρακαλούμε αποδεχθείτε όλες τις δηλώσεις για να χρησιμοποιήσετε την υπηρεσία
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserComplianceDeclarations;