/**
 * Bilingual Internationalization (English / தமிழ்)
 */

export interface TranslationDictionary {
  appName: string;
  subTitle: string;
  voterPortal: string;
  authorityPortal: string;
  auditorPortal: string;
  securityPortal: string;
  resultsPortal: string;
  seniorMode: string;
  seniorModeActive: string;
  normalMode: string;
  languageSelect: string;
  audioGuide: string;
  step1: string;
  step2: string;
  step3: string;
  step4: string;
  step5: string;
  step6: string;
  step7: string;
  voterIdLabel: string;
  voterIdPlaceholder: string;
  verifyVoterIdBtn: string;
  electoralRollStatus: string;
  aadhaarConsentTitle: string;
  aadhaarConsentBody: string;
  aadhaarNumberLabel: string;
  aadhaarPlaceholder: string;
  requestOtpBtn: string;
  enterOtpLabel: string;
  verifyOtpBtn: string;
  credentialIssuedTitle: string;
  credentialIssuedBody: string;
  proceedToBallotBtn: string;
  selectCandidateTitle: string;
  notaLabel: string;
  reviewVoteTitle: string;
  confirmVoteBtn: string;
  voteRecordedTitle: string;
  voteRecordedBody: string;
  receiptNote: string;
  txHashLabel: string;
  blockHeightLabel: string;
  uidaiUnconfiguredAlert: string;
  duplicateVoteAlert: string;
}

export const translations: Record<'en' | 'ta', TranslationDictionary> = {
  en: {
    appName: 'National E-Voting Architecture & Ledger',
    subTitle: 'Election Commission of India • Constitutional Privacy-Preserving Voting Platform',
    voterPortal: 'Voter Portal',
    authorityPortal: 'Election Authority',
    auditorPortal: 'CAG Auditor Portal',
    securityPortal: 'Security & Health',
    resultsPortal: 'Public Results',
    seniorMode: 'Senior Citizen Mode',
    seniorModeActive: 'Senior Mode ON (High Contrast, Large Touch, Audio Instructions)',
    normalMode: 'Standard Display',
    languageSelect: 'Language',
    audioGuide: 'Listen to Voice Instructions',
    step1: '1. Voter ID (EPIC)',
    step2: '2. Electoral Roll',
    step3: '3. Aadhaar Auth',
    step4: '4. Anonymous Token',
    step5: '5. Ballot Choice',
    step6: '6. Review & Nonce',
    step7: '7. Recorded on Ledger',
    voterIdLabel: 'Enter your 10-Character Electoral Photo ID (EPIC):',
    voterIdPlaceholder: 'e.g. TNL1029384',
    verifyVoterIdBtn: 'Verify Voter Eligibility',
    electoralRollStatus: 'Electoral Roll Status',
    aadhaarConsentTitle: 'Informed Consent for Aadhaar Identity Verification',
    aadhaarConsentBody: 'I hereby provide explicit consent to verify my identity via UIDAI for electoral verification purposes only under Section 8 of the Aadhaar Act. I understand my Aadhaar number will never be linked to my candidate choice.',
    aadhaarNumberLabel: 'Enter 12-Digit Aadhaar Number:',
    aadhaarPlaceholder: 'e.g. 5432 9876 1234',
    requestOtpBtn: 'Request Secure UIDAI OTP',
    enterOtpLabel: 'Enter 6-Digit Verification OTP:',
    verifyOtpBtn: 'Authenticate Identity',
    credentialIssuedTitle: 'Anonymous One-Time Voting Credential Issued',
    credentialIssuedBody: 'Your identity has been authenticated and separated from your voting session. You have been issued an unpredictable cryptographic voting token.',
    proceedToBallotBtn: 'Proceed to Candidate Selection',
    selectCandidateTitle: 'Select Exactly One Candidate for Central Chennai Constituency',
    notaLabel: 'None of the Above (NOTA)',
    reviewVoteTitle: 'Review Ballot Submission',
    confirmVoteBtn: 'Cryptographically Confirm & Submit Vote',
    voteRecordedTitle: 'Your Vote Has Been Successfully Recorded',
    voteRecordedBody: 'Your ballot commitment is immutably sealed on the permissioned blockchain ledger.',
    receiptNote: 'Notice: In compliance with constitutional ballot secrecy, this receipt records only cryptographic proof. Your candidate choice is strictly separated from your identity.',
    txHashLabel: 'Blockchain Transaction Reference',
    blockHeightLabel: 'Committed Block Index',
    uidaiUnconfiguredAlert: 'UIDAI authentication integration is not configured or authorized in this environment.',
    duplicateVoteAlert: 'Duplicate Voting Prevented: Credential has already been consumed.',
  },
  ta: {
    appName: 'தேசிய மின்னணு வாக்குப்பதிவு & பிளாக்செயின் கட்டமைப்பு',
    subTitle: 'இந்திய தேர்தல் ஆணையம் • அரசியலமைப்பு ரகசிய வாக்களிப்பு தளம்',
    voterPortal: 'வாக்காளர் தளம்',
    authorityPortal: 'தேர்தல் ஆணையம்',
    auditorPortal: 'சிஏஜி தணிக்கையாளர் தளம்',
    securityPortal: 'பாதுகாப்பு & நிலை',
    resultsPortal: 'தேர்தல் முடிவுகள்',
    seniorMode: 'முதியோர் மற்றும் மாற்றுத்திறனாளிகள் பயன்முறை',
    seniorModeActive: 'முதியோர் பயன்முறை இயக்கத்தில் உள்ளது (பெரிய எழுத்துகள், குரல் வழிகாட்டி)',
    normalMode: 'வழக்கமான திரை',
    languageSelect: 'மொழி',
    audioGuide: 'குரல் வழி வழிமுறைகளைக் கேட்கவும்',
    step1: '1. வாக்காளர் அடையாள அட்டை',
    step2: '2. வாக்காளர் பட்டியல்',
    step3: '3. ஆதார் சரிபார்ப்பு',
    step4: '4. தனிப்பட்ட டோக்கன்',
    step5: '5. வேட்பாளர் தேர்வு',
    step6: '6. சரிபார்த்தல்',
    step7: '7. பதிவு உறுதி',
    voterIdLabel: 'உங்கள் 10-இலக்க வாக்காளர் அடையாள அட்டை எண்ணை (EPIC) உள்ளிடவும்:',
    voterIdPlaceholder: 'எ.கா. TNL1029384',
    verifyVoterIdBtn: 'தகுதியைச் சரிபார்க்கவும்',
    electoralRollStatus: 'வாக்காளர் பட்டியல் நிலை',
    aadhaarConsentTitle: 'ஆதார் அடையாள சரிபார்ப்புக்கான ஒப்புதல்',
    aadhaarConsentBody: 'தேர்தல் தகுதி சரிபார்ப்பிற்காக எனது ஆதார் எண்ணை பயன்படுத்த முழு சம்மதம் வழங்குகிறேன். எனது ஆதார் எண் வேட்பாளர் தேர்வுடன் இணைக்கப்படாது என்பதை உறுதி செய்கிறேன்.',
    aadhaarNumberLabel: '12-இலக்க ஆதார் எண்ணை உள்ளிடவும்:',
    aadhaarPlaceholder: 'எ.கா. 5432 9876 1234',
    requestOtpBtn: 'பாதுகாப்பான கடவுச்சொல் (OTP) கோரவும்',
    enterOtpLabel: '6-இலக்க OTP எண்ணை உள்ளிடவும்:',
    verifyOtpBtn: 'அடையாளத்தை உறுதிசெய்',
    credentialIssuedTitle: 'பெயர் வெளியிடப்படாத ஒருமுறை வாக்களிப்பு டோக்கன் வழங்கப்பட்டது',
    credentialIssuedBody: 'உங்கள் அடையாளம் சரிபார்க்கப்பட்டு வாக்களிப்பு தளத்திலிருந்து தனிமைப்படுத்தப்பட்டுள்ளது. கிரிப்டோகிராபிக் டோக்கன் உருவாக்கப்பட்டது.',
    proceedToBallotBtn: 'வேட்பாளர் தேர்வுக்குச் செல்லவும்',
    selectCandidateTitle: 'மத்திய சென்னை தொகுதிக்கு ஒரு வேட்பாளரைத் தேர்ந்தெடுக்கவும்',
    notaLabel: 'நோட்டா (எவருக்கும் வாக்களிக்க விருப்பமில்லை)',
    reviewVoteTitle: 'வாக்கை உறுதிசெய்யும் திரை',
    confirmVoteBtn: 'வாக்கை இறுதி செய்து சமர்ப்பிக்கவும்',
    voteRecordedTitle: 'உங்கள் வாக்கு வெற்றிகரமாக பிளாக்செயினில் பதிவானது',
    voteRecordedBody: 'உங்கள் வாக்கு ரகசியமாக பிளாக்செயின் லெட்ஜரில் பதிவு செய்யப்பட்டுள்ளது.',
    receiptNote: 'அறிவிப்பு: வாக்கு ரகசியத்தை காக்க, இந்த ரசீதில் வேட்பாளரின் பெயர் காட்டப்படாது. கிரிப்டோகிராபிக் பரிவர்த்தனை எண் மட்டுமே வழங்கப்படுகிறது.',
    txHashLabel: 'பிளாக்செயின் பரிவர்த்தனை எண்',
    blockHeightLabel: 'பதிவு செய்யப்பட்ட பிளாக் எண்',
    uidaiUnconfiguredAlert: 'இந்த சூழலில் UIDAI ஆதார் அங்கீகார இணைப்பு கட்டமைக்கப்படவில்லை அல்லது அங்கீகரிக்கப்படவில்லை.',
    duplicateVoteAlert: 'இரட்டை வாக்கு தடுப்பு: உங்கள் டோக்கன் ஏற்கனவே பயன்படுத்தப்பட்டுள்ளது.',
  },
};
