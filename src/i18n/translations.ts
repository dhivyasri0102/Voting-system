/**
 * Bilingual Internationalization (English / தமிழ்)
 * SMS-based OTP authentication using EPIC voter ID verification
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
  phoneConsentTitle: string;
  phoneConsentBody: string;
  phoneNumberLabel: string;
  phonePlaceholder: string;
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
    step3: '3. Mobile OTP',
    step4: '4. Anonymous Token',
    step5: '5. Ballot Choice',
    step6: '6. Review & Nonce',
    step7: '7. Recorded on Ledger',
    voterIdLabel: 'Enter your 10-Character Electoral Photo ID (EPIC):',
    voterIdPlaceholder: 'e.g. TNL1029384',
    verifyVoterIdBtn: 'Verify Voter Eligibility',
    electoralRollStatus: 'Electoral Roll Status',
    phoneConsentTitle: 'Mobile Number Verification for Voter Identity',
    phoneConsentBody: 'I hereby consent to receiving a One-Time Password (OTP) on my registered mobile number for voter identity verification. My mobile number will never be linked to my candidate choice.',
    phoneNumberLabel: 'Enter Registered Mobile Number:',
    phonePlaceholder: 'e.g. 98765 43210',
    requestOtpBtn: 'Send OTP to Mobile',
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
    step3: '3. மொபைல் OTP',
    step4: '4. தனிப்பட்ட டோக்கன்',
    step5: '5. வேட்பாளர் தேர்வு',
    step6: '6. சரிபார்த்தல்',
    step7: '7. பதிவு உறுதி',
    voterIdLabel: 'உங்கள் 10-இலக்க வாக்காளர் அடையாள அட்டை எண்ணை (EPIC) உள்ளிடவும்:',
    voterIdPlaceholder: 'எ.கா. TNL1029384',
    verifyVoterIdBtn: 'தகுதியைச் சரிபார்க்கவும்',
    electoralRollStatus: 'வாக்காளர் பட்டியல் நிலை',
    phoneConsentTitle: 'வாக்காளர் அடையாளத்திற்கான மொபைல் எண் சரிபார்ப்பு',
    phoneConsentBody: 'வாக்காளர் அடையாள சரிபார்ப்பிற்காக பதிவுசெய்யப்பட்ட மொபைல் எண்ணுக்கு OTP அனுப்ப முழு சம்மதம் வழங்குகிறேன். என் மொபைல் எண் வேட்பாளர் தேர்வுடன் இணைக்கப்படாது.',
    phoneNumberLabel: 'பதிவுசெய்யப்பட்ட மொபைல் எண்ணை உள்ளிடவும்:',
    phonePlaceholder: 'எ.கா. 98765 43210',
    requestOtpBtn: 'மொபைல் OTP அனுப்பவும்',
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
    duplicateVoteAlert: 'இரட்டை வாக்கு தடுப்பு: உங்கள் டோக்கன் ஏற்கனவே பயன்படுத்தப்பட்டுள்ளது.',
  },
};
