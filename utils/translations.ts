export type Lang = 'en' | 'ko' | 'ja' | 'es';

export type TranslationKey =
  | 'nav.home'
  | 'nav.upload'
  | 'nav.guide'
  | 'nav.snapshots'
  | 'nav.premium'
  | 'hero.badge'
  | 'hero.headline'
  | 'hero.subheadline'
  | 'hero.cta'
  | 'hero.cta_secondary'
  | 'how.title'
  | 'how.step1.title'
  | 'how.step1.desc'
  | 'how.step2.title'
  | 'how.step2.desc'
  | 'how.step3.title'
  | 'how.step3.desc'
  | 'how.step4.title'
  | 'how.step4.desc'
  | 'trust.no_login'
  | 'trust.no_ban_risk'
  | 'trust.private'
  | 'features.title'
  | 'features.safe.title'
  | 'features.safe.desc'
  | 'features.private.title'
  | 'features.private.desc'
  | 'features.instant.title'
  | 'features.instant.desc'
  | 'faq.title'
  | 'faq.q1'
  | 'faq.a1'
  | 'faq.q2'
  | 'faq.a2'
  | 'faq.q3'
  | 'faq.a3'
  | 'faq.q4'
  | 'faq.a4'
  | 'premium.title'
  | 'premium.subtitle'
  | 'premium.monthly'
  | 'premium.yearly'
  | 'premium.save'
  | 'premium.feature1'
  | 'premium.feature2'
  | 'premium.feature3'
  | 'premium.cta'
  | 'premium.monthly_available'
  | 'upload.title'
  | 'upload.subtitle'
  | 'upload.drag'
  | 'upload.or'
  | 'upload.browse'
  | 'upload.formats'
  | 'upload.processing'
  | 'upload.error.invalid'
  | 'upload.error.missing'
  | 'dashboard.tab.nonfollowers'
  | 'dashboard.tab.changes'
  | 'dashboard.nonfollowers.title'
  | 'dashboard.nonfollowers.empty'
  | 'dashboard.nonfollowers.count'
  | 'dashboard.changes.title'
  | 'dashboard.changes.locked'
  | 'dashboard.changes.unlock'
  | 'dashboard.changes.new_unfollowers'
  | 'dashboard.changes.new_followers'
  | 'dashboard.export'
  | 'dashboard.snapshot.save'
  | 'dashboard.snapshot.update'
  | 'snapshots.title'
  | 'snapshots.subtitle'
  | 'snapshots.empty'
  | 'snapshots.compare'
  | 'snapshots.delete'
  | 'snapshots.saved'
  | 'snapshots.limit'
  | 'modal.title'
  | 'modal.subtitle'
  | 'modal.monthly_label'
  | 'modal.yearly_label'
  | 'modal.yearly_save'
  | 'modal.feature1'
  | 'modal.feature2'
  | 'modal.feature3'
  | 'modal.buy_monthly'
  | 'modal.buy_yearly'
  | 'modal.verify_title'
  | 'modal.verify_placeholder'
  | 'modal.verify_btn'
  | 'modal.verify_success'
  | 'modal.verify_fail'
  | 'guide.title'
  | 'guide.subtitle'
  | 'guide.step1.title'
  | 'guide.step1.desc'
  | 'guide.step2.title'
  | 'guide.step2.desc'
  | 'guide.step3.title'
  | 'guide.step3.desc'
  | 'guide.step4.title'
  | 'guide.step4.desc'
  | 'guide.cta'
  | 'footer.privacy'
  | 'footer.terms'
  | 'footer.guide'
  | 'footer.tagline'
  | 'common.loading'
  | 'common.error'
  | 'common.back'
  | 'common.close'
  | 'common.or'
  | 'upload.snapshot_prompt'
  | 'upload.new_file'
  | 'footer.cancel'
  | 'cancel.title'
  | 'cancel.subtitle'
  | 'cancel.email_label'
  | 'cancel.warning_title'
  | 'cancel.warning1'
  | 'cancel.warning2'
  | 'cancel.warning3'
  | 'cancel.warning4'
  | 'cancel.sending'
  | 'cancel.send_code'
  | 'cancel.changed_mind'
  | 'cancel.go_home'
  | 'cancel.check_email'
  | 'cancel.code_sent'
  | 'cancel.code_label'
  | 'cancel.code_expires'
  | 'cancel.next'
  | 'cancel.different_email'
  | 'cancel.confirm_title'
  | 'cancel.confirm_subtitle'
  | 'cancel.confirm_warning'
  | 'cancel.cancelling'
  | 'cancel.confirm_btn'
  | 'cancel.keep_btn'
  | 'cancel.success_title'
  | 'cancel.success_subtitle'
  | 'cancel.success_msg'
  | 'cancel.back_btn'
  | 'cancel.error_title'
  | 'cancel.try_again'
  | 'cancel.go_home_btn'
  | 'cancel.invalid_email'
  | 'cancel.network_error';

type Translations = Record<TranslationKey, string>;

const en: Translations = {
  'nav.home': 'SafeUnfollow',
  'nav.upload': 'Upload',
  'nav.guide': 'Guide',
  'nav.snapshots': 'Snapshots',
  'nav.premium': 'Premium',
  'hero.badge': 'Privacy-first • No account connection',
  'hero.headline': 'See who unfollowed you on Instagram — without logging in.',
  'hero.subheadline': 'SafeUnfollow analyzes your Instagram data export, not your account. No login, no OAuth, no API, and zero ban risk.',
  'hero.cta': 'See Who Unfollowed You',
  'hero.cta_secondary': 'Upload your Instagram ZIP →',
  'how.title': 'How It Works',
  'how.step1.title': 'Request Your Instagram Data',
  'how.step1.desc': 'Request your followers and following data export from Instagram.',
  'how.step2.title': 'Download the ZIP File',
  'how.step2.desc': 'Download the prepared ZIP file directly from Instagram.',
  'how.step3.title': 'Upload to SafeUnfollow',
  'how.step3.desc': 'Manually select and upload the ZIP file you downloaded.',
  'how.step4.title': 'See Who Unfollowed You',
  'how.step4.desc': 'Compare snapshots to see new unfollowers and follower changes.',
  'trust.no_login': 'No Instagram login',
  'trust.no_ban_risk': 'Zero ban risk',
  'trust.private': 'Privacy-first',
  'features.title': 'Private by Design. Safe for Your Account.',
  'features.safe.title': 'Zero Ban Risk',
  'features.safe.desc': 'No Instagram login, OAuth, API, account connection, or automated account activity.',
  'features.private.title': 'Privacy-First',
  'features.private.desc': 'Your data never leaves your browser. All processing happens locally on your device.',
  'features.instant.title': 'Manual ZIP Upload',
  'features.instant.desc': 'You download your data from Instagram and choose exactly which file to analyze.',
  'faq.title': 'Frequently Asked Questions',
  'faq.q1': 'Is my account safe?',
  'faq.a1': 'Yes. SafeUnfollow analyzes only the Instagram data export you manually upload. It requires no login, OAuth, API, or account connection, so there is zero ban risk.',
  'faq.q2': 'What file do I need to upload?',
  'faq.a2': 'Request your Instagram data, select followers and following in JSON format, then download the ZIP file from Instagram and upload it manually to SafeUnfollow.',
  'faq.q3': 'Is my data stored anywhere?',
  'faq.a3': 'No. Your Instagram data is processed entirely in your browser and never sent to any server. Only your email address is stored if you purchase premium access.',
  'faq.q4': 'What does Premium unlock?',
  'faq.a4': 'Premium unlocks unlimited snapshots to track changes over time, CSV export for your data, and a full change history timeline showing new unfollowers and new followers between snapshots.',
  'premium.title': 'Track Every Follower Change',
  'premium.subtitle': 'Premium gives you unlimited snapshots, CSV export, and a complete change history timeline.',
  'premium.monthly': '$3.99 / month',
  'premium.yearly': '$19.99 / year',
  'premium.save': 'Save 58%',
  'premium.feature1': 'Unlimited snapshots',
  'premium.feature2': 'CSV export',
  'premium.feature3': 'Change history timeline',
  'premium.cta': 'Unlock Premium',
  'premium.monthly_available': '{price} also available',
  'upload.title': 'Upload Your Instagram Data',
  'upload.subtitle': 'Your file is processed 100% on your device. Nothing is uploaded to our servers.',
  'upload.drag': 'Drag & drop your file here',
  'upload.or': 'or',
  'upload.browse': 'Browse Files',
  'upload.formats': 'Accepts .zip or .json files from Instagram data export',
  'upload.processing': 'Processing your file…',
  'upload.error.invalid': 'Invalid file format. Please upload a .zip or .json file from Instagram.',
  'upload.error.missing': 'Could not find follower/following data in the file. Make sure you downloaded the correct Instagram export.',
  'dashboard.tab.nonfollowers': 'Don\'t Follow Back',
  'dashboard.tab.changes': 'Changes',
  'dashboard.nonfollowers.title': 'Accounts That Don\'t Follow You Back',
  'dashboard.nonfollowers.empty': 'Everyone you follow also follows you back! 🎉',
  'dashboard.nonfollowers.count': '{count} accounts don\'t follow you back',
  'dashboard.changes.title': 'Changes Since Last Snapshot',
  'dashboard.changes.locked': 'Upgrade to see who unfollowed you since your last snapshot.',
  'dashboard.changes.unlock': 'Unlock Changes',
  'dashboard.changes.new_unfollowers': 'New unfollowers',
  'dashboard.changes.new_followers': 'New followers',
  'dashboard.export': 'Export CSV',
  'dashboard.snapshot.save': 'Save Snapshot',
  'dashboard.snapshot.update': 'Update Snapshot',
  'snapshots.title': 'Your Snapshots',
  'snapshots.subtitle': 'Compare snapshots to track who unfollowed you over time.',
  'snapshots.empty': 'No snapshots yet. Upload your Instagram data to create your first snapshot.',
  'snapshots.compare': 'Compare',
  'snapshots.delete': 'Delete',
  'snapshots.saved': 'Snapshot saved!',
  'snapshots.limit': 'Free users can save 1 snapshot. Upgrade to Premium for unlimited snapshots.',
  'modal.title': 'Unlock Premium Features',
  'modal.subtitle': 'See who unfollowed you, export your data, and track changes over time.',
  'modal.monthly_label': 'Monthly',
  'modal.yearly_label': 'Yearly',
  'modal.yearly_save': 'Save 58%',
  'modal.feature1': 'Unlimited snapshots',
  'modal.feature2': 'CSV export',
  'modal.feature3': 'Change history timeline',
  'modal.buy_monthly': 'Get Monthly — $3.99/mo',
  'modal.buy_yearly': 'Get Yearly — $19.99/yr',
  'modal.verify_title': 'Already purchased?',
  'modal.verify_placeholder': 'Enter your email',
  'modal.verify_btn': 'Verify',
  'modal.verify_success': '✓ Premium activated!',
  'modal.verify_fail': 'Email not found. Please check your purchase email.',
  'guide.title': 'How to Download Your Instagram Data',
  'guide.subtitle': 'Follow these steps to export your followers and following list from Instagram.',
  'guide.step1.title': 'Open Instagram Settings',
  'guide.step1.desc': 'Tap your profile picture → Menu (☰) → Settings and privacy → Your activity → Download your information.',
  'guide.step2.title': 'Select Data to Download',
  'guide.step2.desc': 'Choose "Some of your information" and select "Followers and following" only. Set format to JSON.',
  'guide.step3.title': 'Request the Download',
  'guide.step3.desc': 'Tap "Create files". Instagram will prepare your data — this usually takes a few minutes.',
  'guide.step4.title': 'Download and Upload',
  'guide.step4.desc': 'Once ready, download the ZIP file. Then come back here and upload it.',
  'guide.cta': 'I have my file — Upload Now',
  'footer.privacy': 'Privacy Policy',
  'footer.terms': 'Terms of Service',
  'footer.guide': 'Download Guide',
  'footer.tagline': '100% private. No login required.',
  'common.loading': 'Loading…',
  'common.error': 'Something went wrong. Please try again.',
  'common.back': 'Back',
  'common.close': 'Close',
  'common.or': 'or',
  'upload.snapshot_prompt': 'Upload another file to compare changes',
  'upload.new_file': 'Upload New File',
  'footer.cancel': 'Cancel Subscription',
  'cancel.title': 'Cancel subscription',
  'cancel.subtitle': 'Enter the email address you used to purchase SafeUnfollow Premium. We\'ll email you a confirmation code before cancelling.',
  'cancel.email_label': 'Email address',
  'cancel.warning_title': 'Before you cancel',
  'cancel.warning1': 'Unlimited snapshots will no longer be available',
  'cancel.warning2': 'CSV export will be disabled',
  'cancel.warning3': 'Changes tracking will be locked',
  'cancel.warning4': 'This action cannot be undone',
  'cancel.sending': 'Sending code…',
  'cancel.send_code': 'Send confirmation code',
  'cancel.changed_mind': 'Changed your mind?',
  'cancel.go_home': 'Go back home',
  'cancel.check_email': 'Check your email',
  'cancel.code_sent': 'We sent a 6-digit confirmation code to:',
  'cancel.code_label': 'Confirmation code',
  'cancel.code_expires': 'Code expires in 15 minutes.',
  'cancel.next': 'Next',
  'cancel.different_email': 'Use a different email',
  'cancel.confirm_title': 'Are you sure?',
  'cancel.confirm_subtitle': 'You are about to cancel the subscription for:',
  'cancel.confirm_warning': 'Premium access will be removed immediately. You will not receive a refund for the current billing period.',
  'cancel.cancelling': 'Cancelling…',
  'cancel.confirm_btn': 'Yes, cancel my subscription',
  'cancel.keep_btn': 'Keep my subscription',
  'cancel.success_title': 'Subscription cancelled',
  'cancel.success_subtitle': 'Your premium access has been removed for:',
  'cancel.success_msg': 'You can still use SafeUnfollow for free. If you change your mind, you can resubscribe at any time.',
  'cancel.back_btn': 'Back to SafeUnfollow',
  'cancel.error_title': 'Something went wrong',
  'cancel.try_again': 'Try again',
  'cancel.go_home_btn': 'Go home',
  'cancel.invalid_email': 'Please enter a valid email address.',
  'cancel.network_error': 'Network error. Please check your connection and try again.',
};

const ko: Translations = {
  'nav.home': 'SafeUnfollow',
  'nav.upload': '업로드',
  'nav.guide': '가이드',
  'nav.snapshots': '스냅샷',
  'nav.premium': '프리미엄',
  'hero.badge': '개인정보 보호 중심 • 계정 연결 없음',
  'hero.headline': '인스타그램에서 누가 나를 언팔했는지, 로그인 없이 확인하세요.',
  'hero.subheadline': 'SafeUnfollow는 계정에 연결하지 않고 Instagram 데이터 내보내기 파일을 분석합니다. 로그인 없음, OAuth 없음, API 없음, 계정 정지 위험 없음.',
  'hero.cta': '언팔로우 확인하기',
  'hero.cta_secondary': 'Instagram ZIP 파일 업로드 →',
  'how.title': '사용 방법',
  'how.step1.title': 'Instagram 데이터 요청',
  'how.step1.desc': 'Instagram에서 팔로워 및 팔로잉 데이터 내보내기를 요청하세요.',
  'how.step2.title': 'ZIP 파일 다운로드',
  'how.step2.desc': 'Instagram에서 준비된 ZIP 파일을 직접 다운로드하세요.',
  'how.step3.title': 'SafeUnfollow에 업로드',
  'how.step3.desc': '다운로드한 ZIP 파일을 직접 선택해 업로드하세요.',
  'how.step4.title': '언팔로우 결과 확인',
  'how.step4.desc': '스냅샷을 비교해 새로 언팔로우한 계정과 팔로워 변화를 확인하세요.',
  'trust.no_login': 'Instagram 로그인 없음',
  'trust.no_ban_risk': '계정 정지 위험 없음',
  'trust.private': '개인정보 보호 중심',
  'features.title': '계정은 안전하게, 데이터는 사생활로',
  'features.safe.title': '계정 정지 위험 없음',
  'features.safe.desc': 'Instagram 로그인, OAuth, API, 계정 연결, 자동화된 계정 활동을 사용하지 않습니다.',
  'features.private.title': '개인정보 보호 중심',
  'features.private.desc': '데이터가 브라우저를 벗어나지 않습니다. 모든 처리가 기기에서 로컬로 이루어집니다.',
  'features.instant.title': 'ZIP 파일 직접 업로드',
  'features.instant.desc': 'Instagram에서 데이터를 다운로드한 뒤 분석할 파일을 직접 선택합니다.',
  'faq.title': '자주 묻는 질문',
  'faq.q1': '계정이 안전한가요?',
  'faq.a1': '네. SafeUnfollow는 직접 업로드한 Instagram 데이터 내보내기 파일만 분석합니다. 로그인, OAuth, API, 계정 연결이 필요 없어 계정 정지 위험이 없습니다.',
  'faq.q2': '어떤 파일을 업로드해야 하나요?',
  'faq.a2': 'Instagram 데이터를 요청하고 JSON 형식의 팔로워 및 팔로잉 항목을 선택하세요. Instagram에서 ZIP 파일을 다운로드한 뒤 SafeUnfollow에 직접 업로드하면 됩니다.',
  'faq.q3': '데이터가 어딘가에 저장되나요?',
  'faq.a3': '아니요. 인스타그램 데이터는 브라우저에서 완전히 처리되며 서버로 전송되지 않습니다. 프리미엄 액세스를 구매하는 경우 이메일 주소만 저장됩니다.',
  'faq.q4': '프리미엄으로 무엇이 가능해지나요?',
  'faq.a4': '프리미엄은 무제한 스냅샷, CSV 내보내기, 새로운 언팔로워와 팔로워 변화를 보여주는 전체 변경 이력 타임라인을 제공합니다.',
  'premium.title': '모든 팔로워 변화를 추적하세요',
  'premium.subtitle': '프리미엄으로 무제한 스냅샷, CSV 내보내기, 전체 변경 이력 타임라인을 이용하세요.',
  'premium.monthly': '월 $3.99',
  'premium.yearly': '연 $19.99',
  'premium.save': '58% 절약',
  'premium.feature1': '무제한 스냅샷',
  'premium.feature2': 'CSV 내보내기',
  'premium.feature3': '변경 이력 타임라인',
  'premium.cta': '프리미엄 잠금 해제',
  'premium.monthly_available': '{price} 월간 플랜도 이용 가능',
  'upload.title': '인스타그램 데이터 업로드',
  'upload.subtitle': '파일은 기기에서 100% 처리됩니다. 서버에 업로드되지 않습니다.',
  'upload.drag': '파일을 여기에 드래그 앤 드롭하세요',
  'upload.or': '또는',
  'upload.browse': '파일 찾기',
  'upload.formats': '인스타그램 데이터 내보내기의 .zip 또는 .json 파일 허용',
  'upload.processing': '파일 처리 중…',
  'upload.error.invalid': '잘못된 파일 형식입니다. 인스타그램의 .zip 또는 .json 파일을 업로드하세요.',
  'upload.error.missing': '파일에서 팔로워/팔로잉 데이터를 찾을 수 없습니다. 올바른 인스타그램 내보내기를 다운로드했는지 확인하세요.',
  'dashboard.tab.nonfollowers': '맞팔 안 함',
  'dashboard.tab.changes': '변경 사항',
  'dashboard.nonfollowers.title': '맞팔 안 한 계정',
  'dashboard.nonfollowers.empty': '팔로우하는 모든 계정이 맞팔해요! 🎉',
  'dashboard.nonfollowers.count': '{count}개 계정이 맞팔하지 않습니다',
  'dashboard.changes.title': '마지막 스냅샷 이후 변경 사항',
  'dashboard.changes.locked': '마지막 스냅샷 이후 누가 언팔로우했는지 보려면 업그레이드하세요.',
  'dashboard.changes.unlock': '변경 사항 잠금 해제',
  'dashboard.changes.new_unfollowers': '새 언팔로워',
  'dashboard.changes.new_followers': '새 팔로워',
  'dashboard.export': 'CSV 내보내기',
  'dashboard.snapshot.save': '스냅샷 저장',
  'dashboard.snapshot.update': '스냅샷 업데이트',
  'snapshots.title': '내 스냅샷',
  'snapshots.subtitle': '스냅샷을 비교하여 시간이 지남에 따라 누가 언팔로우했는지 추적하세요.',
  'snapshots.empty': '아직 스냅샷이 없습니다. 인스타그램 데이터를 업로드하여 첫 번째 스냅샷을 만드세요.',
  'snapshots.compare': '비교',
  'snapshots.delete': '삭제',
  'snapshots.saved': '스냅샷이 저장되었습니다!',
  'snapshots.limit': '무료 사용자는 스냅샷 1개를 저장할 수 있습니다. 무제한 스냅샷은 프리미엄으로 업그레이드하세요.',
  'modal.title': '프리미엄 기능 잠금 해제',
  'modal.subtitle': '누가 언팔로우했는지 확인하고, 데이터를 내보내고, 시간 경과에 따른 변화를 추적하세요.',
  'modal.monthly_label': '월간',
  'modal.yearly_label': '연간',
  'modal.yearly_save': '58% 절약',
  'modal.feature1': '무제한 스냅샷',
  'modal.feature2': 'CSV 내보내기',
  'modal.feature3': '변경 이력 타임라인',
  'modal.buy_monthly': '월간 구독 — $3.99/월',
  'modal.buy_yearly': '연간 구독 — $19.99/년',
  'modal.verify_title': '이미 구매하셨나요?',
  'modal.verify_placeholder': '이메일 입력',
  'modal.verify_btn': '확인',
  'modal.verify_success': '✓ 프리미엄 활성화됨!',
  'modal.verify_fail': '이메일을 찾을 수 없습니다. 구매 이메일을 확인하세요.',
  'guide.title': '인스타그램 데이터 다운로드 방법',
  'guide.subtitle': '다음 단계에 따라 인스타그램에서 팔로워 및 팔로잉 목록을 내보내세요.',
  'guide.step1.title': '인스타그램 설정 열기',
  'guide.step1.desc': '프로필 사진 탭 → 메뉴(☰) → 설정 및 개인정보 → 내 활동 → 정보 다운로드.',
  'guide.step2.title': '다운로드할 데이터 선택',
  'guide.step2.desc': '"일부 정보"를 선택하고 "팔로워 및 팔로잉"만 선택하세요. 형식을 JSON으로 설정하세요.',
  'guide.step3.title': '다운로드 요청',
  'guide.step3.desc': '"파일 생성"을 탭하세요. 인스타그램이 데이터를 준비합니다 — 보통 몇 분 걸립니다.',
  'guide.step4.title': '다운로드 및 업로드',
  'guide.step4.desc': '준비되면 ZIP 파일을 다운로드하세요. 그런 다음 여기로 돌아와 업로드하세요.',
  'guide.cta': '파일이 있어요 — 지금 업로드',
  'footer.privacy': '개인정보 처리방침',
  'footer.terms': '서비스 이용약관',
  'footer.guide': '다운로드 가이드',
  'footer.tagline': '100% 비공개. 로그인 불필요.',
  'common.loading': '로딩 중…',
  'common.error': '오류가 발생했습니다. 다시 시도해 주세요.',
  'common.back': '뒤로',
  'common.close': '닫기',
  'common.or': '또는',
  'upload.snapshot_prompt': '다른 파일을 업로드하여 변경 사항을 비교하세요',
  'upload.new_file': '새 파일 업로드',
  'footer.cancel': '구독 취소',
  'cancel.title': '구독 취소',
  'cancel.subtitle': 'SafeUnfollow Premium 구매 시 사용한 이메일 주소를 입력하세요. 취소 전에 확인 코드를 이메일로 보내드립니다.',
  'cancel.email_label': '이메일 주소',
  'cancel.warning_title': '취소하기 전에',
  'cancel.warning1': '무제한 스냅샷을 더 이상 사용할 수 없습니다',
  'cancel.warning2': 'CSV 내보내기가 비활성화됩니다',
  'cancel.warning3': '변경 사항 추적이 잠깁니다',
  'cancel.warning4': '이 작업은 취소할 수 없습니다',
  'cancel.sending': '코드 전송 중…',
  'cancel.send_code': '확인 코드 전송',
  'cancel.changed_mind': '마음이 바뀌셨나요?',
  'cancel.go_home': '홈으로 돌아가기',
  'cancel.check_email': '이메일을 확인하세요',
  'cancel.code_sent': '6자리 확인 코드를 다음 주소로 전송했습니다:',
  'cancel.code_label': '확인 코드',
  'cancel.code_expires': '코드는 15분 후 만료됩니다.',
  'cancel.next': '다음',
  'cancel.different_email': '다른 이메일 사용',
  'cancel.confirm_title': '정말 취소하시겠습니까?',
  'cancel.confirm_subtitle': '다음 계정의 구독을 취소하려고 합니다:',
  'cancel.confirm_warning': '프리미엄 액세스가 즉시 제거됩니다. 현재 청구 기간에 대한 환불은 제공되지 않습니다.',
  'cancel.cancelling': '취소 중…',
  'cancel.confirm_btn': '네, 구독을 취소합니다',
  'cancel.keep_btn': '구독 유지',
  'cancel.success_title': '구독이 취소되었습니다',
  'cancel.success_subtitle': '다음 계정의 프리미엄 액세스가 제거되었습니다:',
  'cancel.success_msg': 'SafeUnfollow는 무료로 계속 사용할 수 있습니다. 마음이 바뀌면 언제든지 다시 구독할 수 있습니다.',
  'cancel.back_btn': 'SafeUnfollow로 돌아가기',
  'cancel.error_title': '오류가 발생했습니다',
  'cancel.try_again': '다시 시도',
  'cancel.go_home_btn': '홈으로 이동',
  'cancel.invalid_email': '유효한 이메일 주소를 입력해 주세요.',
  'cancel.network_error': '네트워크 오류입니다. 연결 상태를 확인하고 다시 시도해 주세요.',
};

const ja: Translations = {
  'nav.home': 'SafeUnfollow',
  'nav.upload': 'アップロード',
  'nav.guide': 'ガイド',
  'nav.snapshots': 'スナップショット',
  'nav.premium': 'プレミアム',
  'hero.badge': '365+ユーザー • 10+カ国',
  'hero.headline': 'Instagramでフォローバックしていないアカウントを確認',
  'hero.subheadline': 'ログイン不要。BANリスクなし。100%プライベート — すべてデバイス上で処理。',
  'hero.cta': '今すぐ確認 — 無料',
  'hero.cta_secondary': 'ファイルを持っている →',
  'how.title': '使い方',
  'how.step1.title': 'データをダウンロード',
  'how.step1.desc': 'Instagramアプリからデータエクスポートをリクエスト。数分で完了します。',
  'how.step2.title': 'ファイルをアップロード',
  'how.step2.desc': 'ZIPまたはJSONファイルをドラッグ＆ドロップ — すべてデバイスに留まります。',
  'how.step3.title': '即座に結果を確認',
  'how.step3.desc': 'フォローバックしていないアカウントを確認し、時間の経過による変化を追跡。',
  'how.step4.title': '即座に結果を確認',
  'how.step4.desc': 'フォローバックしていないアカウントを確認し、時間の経過による変化を追跡。',
  'trust.no_login': 'No Instagram login',
  'trust.no_ban_risk': 'No ban risk',
  'trust.private': '100% private',
  'features.title': 'SafeUnfollowを選ぶ理由',
  'features.safe.title': 'BANリスクゼロ',
  'features.safe.desc': 'Instagramアカウントには一切アクセスしません。認証情報、API呼び出し、ボット活動なし。',
  'features.private.title': '100%プライベート',
  'features.private.desc': 'データはブラウザの外に出ません。すべての処理はデバイス上でローカルに行われます。',
  'features.instant.title': '即座の結果',
  'features.instant.desc': 'ファイルをアップロードすると、数秒でフォローバックしていないアカウントが表示されます。',
  'faq.title': 'よくある質問',
  'faq.q1': 'アカウントは安全ですか？',
  'faq.a1': '完全に安全です。SafeUnfollowはInstagramに接続しません。自分のデータエクスポートファイルをアップロードし、すべてがデバイス上でローカルに処理されます。認証情報は入力または保存されません。',
  'faq.q2': 'どのファイルをアップロードすればいいですか？',
  'faq.a2': 'Instagramのデータエクスポートが必要です。設定→あなたのアクティビティ→情報をダウンロードへ。JSON形式でフォロワーとフォロー中のデータを選択。完全なZIPアーカイブまたは個別のJSONファイルを受け付けます。',
  'faq.q3': 'データはどこかに保存されますか？',
  'faq.a3': 'いいえ。InstagramのデータはブラウザでのみSST処理され、サーバーには送信されません。プレミアムアクセスを購入した場合のみ、メールアドレスが保存されます。',
  'faq.q4': 'プレミアムで何が解放されますか？',
  'faq.a4': 'プレミアムでは、時間経過を追跡するための無制限スナップショット、データのCSVエクスポート、スナップショット間の新しいアンフォロワーと新しいフォロワーを表示する変更履歴タイムラインが解放されます。',
  'premium.title': '時間の経過による変化を追跡',
  'premium.subtitle': '前回からアンフォローした人を確認し、データをエクスポート。',
  'premium.monthly': '$3.99 / 月',
  'premium.yearly': '$19.99 / 年',
  'premium.save': '58%お得',
  'premium.feature1': '無制限スナップショット',
  'premium.feature2': 'CSVエクスポート',
  'premium.feature3': '変更履歴タイムライン',
  'premium.cta': 'プレミアムを取得',
  'premium.monthly_available': '{price} also available',
  'upload.title': 'Instagramデータをアップロード',
  'upload.subtitle': 'ファイルはデバイス上で100%処理されます。サーバーにはアップロードされません。',
  'upload.drag': 'ここにファイルをドラッグ＆ドロップ',
  'upload.or': 'または',
  'upload.browse': 'ファイルを選択',
  'upload.formats': 'Instagramデータエクスポートの.zipまたは.jsonファイルを受け付けます',
  'upload.processing': 'ファイルを処理中…',
  'upload.error.invalid': '無効なファイル形式です。InstagramのZIPまたはJSONファイルをアップロードしてください。',
  'upload.error.missing': 'ファイルにフォロワー/フォロー中のデータが見つかりませんでした。正しいInstagramエクスポートをダウンロードしたか確認してください。',
  'dashboard.tab.nonfollowers': 'フォローバックなし',
  'dashboard.tab.changes': '変更',
  'dashboard.nonfollowers.title': 'フォローバックしていないアカウント',
  'dashboard.nonfollowers.empty': 'フォローしている全員がフォローバックしています！🎉',
  'dashboard.nonfollowers.count': '{count}件のアカウントがフォローバックしていません',
  'dashboard.changes.title': '前回のスナップショット以降の変更',
  'dashboard.changes.locked': '前回のスナップショット以降にアンフォローした人を見るにはアップグレードしてください。',
  'dashboard.changes.unlock': '変更を解放',
  'dashboard.changes.new_unfollowers': '新しいアンフォロワー',
  'dashboard.changes.new_followers': '新しいフォロワー',
  'dashboard.export': 'CSVエクスポート',
  'dashboard.snapshot.save': 'スナップショットを保存',
  'dashboard.snapshot.update': 'スナップショットを更新',
  'snapshots.title': 'スナップショット',
  'snapshots.subtitle': 'スナップショットを比較して、時間の経過でアンフォローした人を追跡。',
  'snapshots.empty': 'スナップショットはまだありません。Instagramデータをアップロードして最初のスナップショットを作成してください。',
  'snapshots.compare': '比較',
  'snapshots.delete': '削除',
  'snapshots.saved': 'スナップショットを保存しました！',
  'snapshots.limit': '無料ユーザーは1件のスナップショットを保存できます。無制限スナップショットはプレミアムにアップグレードしてください。',
  'modal.title': 'プレミアム機能を解放',
  'modal.subtitle': 'アンフォローした人を確認し、データをエクスポートし、時間経過の変化を追跡。',
  'modal.monthly_label': '月額',
  'modal.yearly_label': '年額',
  'modal.yearly_save': '58%お得',
  'modal.feature1': '無制限スナップショット',
  'modal.feature2': 'CSVエクスポート',
  'modal.feature3': '変更履歴タイムライン',
  'modal.buy_monthly': '月額プラン — $3.99/月',
  'modal.buy_yearly': '年額プラン — $19.99/年',
  'modal.verify_title': '既に購入済みですか？',
  'modal.verify_placeholder': 'メールアドレスを入力',
  'modal.verify_btn': '確認',
  'modal.verify_success': '✓ プレミアム有効化！',
  'modal.verify_fail': 'メールが見つかりませんでした。購入時のメールを確認してください。',
  'guide.title': 'Instagramデータのダウンロード方法',
  'guide.subtitle': 'これらの手順に従って、Instagramからフォロワーとフォロー中のリストをエクスポートしてください。',
  'guide.step1.title': 'Instagram設定を開く',
  'guide.step1.desc': 'プロフィール写真をタップ → メニュー(☰) → 設定とプライバシー → あなたのアクティビティ → 情報をダウンロード。',
  'guide.step2.title': 'ダウンロードするデータを選択',
  'guide.step2.desc': '「一部の情報」を選択し、「フォロワーとフォロー中」のみを選択。形式をJSONに設定。',
  'guide.step3.title': 'ダウンロードをリクエスト',
  'guide.step3.desc': '「ファイルを作成」をタップ。Instagramがデータを準備します — 通常数分かかります。',
  'guide.step4.title': 'ダウンロードとアップロード',
  'guide.step4.desc': '準備ができたらZIPファイルをダウンロード。その後、ここに戻ってアップロードしてください。',
  'guide.cta': 'ファイルがある — 今すぐアップロード',
  'footer.privacy': 'プライバシーポリシー',
  'footer.terms': '利用規約',
  'footer.guide': 'ダウンロードガイド',
  'footer.tagline': '100%プライベート。ログイン不要。',
  'common.loading': '読み込み中…',
  'common.error': 'エラーが発生しました。もう一度お試しください。',
  'common.back': '戻る',
  'common.close': '閉じる',
  'common.or': 'または',
  'upload.snapshot_prompt': '別のファイルをアップロードして変更を比較しましょう',
  'upload.new_file': '新しいファイルをアップロード',
  'footer.cancel': 'サブスクリプションをキャンセル',
  'cancel.title': 'サブスクリプションのキャンセル',
  'cancel.subtitle': 'SafeUnfollow Premiumの購入に使用したメールアドレスを入力してください。キャンセル前に確認コードをメールでお送りします。',
  'cancel.email_label': 'メールアドレス',
  'cancel.warning_title': 'キャンセルする前に',
  'cancel.warning1': '無制限スナップショットが利用できなくなります',
  'cancel.warning2': 'CSVエクスポートが無効になります',
  'cancel.warning3': '変更追跡がロックされます',
  'cancel.warning4': 'この操作は元に戻せません',
  'cancel.sending': 'コードを送信中…',
  'cancel.send_code': '確認コードを送信',
  'cancel.changed_mind': '気が変わりましたか？',
  'cancel.go_home': 'ホームに戻る',
  'cancel.check_email': 'メールを確認してください',
  'cancel.code_sent': '6桁の確認コードを以下のアドレスに送信しました：',
  'cancel.code_label': '確認コード',
  'cancel.code_expires': 'コードは15分後に期限切れになります。',
  'cancel.next': '次へ',
  'cancel.different_email': '別のメールを使用',
  'cancel.confirm_title': '本当によろしいですか？',
  'cancel.confirm_subtitle': '以下のアカウントのサブスクリプションをキャンセルしようとしています：',
  'cancel.confirm_warning': 'プレミアムアクセスはすぐに削除されます。現在の請求期間の返金はありません。',
  'cancel.cancelling': 'キャンセル中…',
  'cancel.confirm_btn': 'はい、サブスクリプションをキャンセルします',
  'cancel.keep_btn': 'サブスクリプションを維持する',
  'cancel.success_title': 'サブスクリプションがキャンセルされました',
  'cancel.success_subtitle': '以下のアカウントのプレミアムアクセスが削除されました：',
  'cancel.success_msg': 'SafeUnfollowは引き続き無料でご利用いただけます。気が変わった場合は、いつでも再登録できます。',
  'cancel.back_btn': 'SafeUnfollowに戻る',
  'cancel.error_title': 'エラーが発生しました',
  'cancel.try_again': 'もう一度試す',
  'cancel.go_home_btn': 'ホームへ',
  'cancel.invalid_email': '有効なメールアドレスを入力してください。',
  'cancel.network_error': 'ネットワークエラーです。接続を確認してもう一度お試しください。',
};

const es: Translations = {
  'nav.home': 'SafeUnfollow',
  'nav.upload': 'Subir',
  'nav.guide': 'Guía',
  'nav.snapshots': 'Instantáneas',
  'nav.premium': 'Premium',
  'hero.badge': '365+ usuarios • 10+ países',
  'hero.headline': 'Ve quién no te sigue de vuelta en Instagram',
  'hero.subheadline': 'Sin inicio de sesión. Sin riesgo de ban. 100% privado — procesado completamente en tu dispositivo.',
  'hero.cta': 'Verificar ahora — Es gratis',
  'hero.cta_secondary': 'Ya tengo mi archivo →',
  'how.title': 'Cómo funciona',
  'how.step1.title': 'Descarga tus datos',
  'how.step1.desc': 'Solicita tu exportación de datos de Instagram desde la app. Tarda unos minutos.',
  'how.step2.title': 'Sube tu archivo',
  'how.step2.desc': 'Arrastra y suelta el archivo ZIP o JSON — todo queda en tu dispositivo.',
  'how.step3.title': 'Ve resultados al instante',
  'how.step3.desc': 'Ve quién no te sigue de vuelta y rastrea cambios a lo largo del tiempo.',
  'how.step4.title': 'Ve resultados al instante',
  'how.step4.desc': 'Ve quién no te sigue de vuelta y rastrea cambios a lo largo del tiempo.',
  'trust.no_login': 'No Instagram login',
  'trust.no_ban_risk': 'No ban risk',
  'trust.private': '100% private',
  'features.title': '¿Por qué SafeUnfollow?',
  'features.safe.title': 'Cero riesgo de ban',
  'features.safe.desc': 'Nunca accedemos a tu cuenta de Instagram. Sin credenciales, sin llamadas API, sin bots.',
  'features.private.title': '100% privado',
  'features.private.desc': 'Tus datos nunca salen de tu navegador. Todo el procesamiento ocurre localmente.',
  'features.instant.title': 'Resultados instantáneos',
  'features.instant.desc': 'Sube tu archivo y ve quién no te sigue de vuelta en segundos.',
  'faq.title': 'Preguntas frecuentes',
  'faq.q1': '¿Mi cuenta está segura?',
  'faq.a1': 'Completamente seguro. SafeUnfollow nunca se conecta a Instagram. Subes tu propio archivo de exportación de datos, y todo se procesa localmente en tu dispositivo. Nunca se ingresan ni almacenan credenciales.',
  'faq.q2': '¿Qué archivo necesito subir?',
  'faq.a2': 'Necesitas la exportación de datos de Instagram. Ve a Configuración → Tu actividad → Descargar tu información. Selecciona datos de seguidores y seguidos en formato JSON. Aceptamos el archivo ZIP completo o archivos JSON individuales.',
  'faq.q3': '¿Mis datos se almacenan en algún lugar?',
  'faq.a3': 'No. Tus datos de Instagram se procesan completamente en tu navegador y nunca se envían a ningún servidor. Solo tu dirección de correo se almacena si compras acceso premium.',
  'faq.q4': '¿Qué desbloquea Premium?',
  'faq.a4': 'Premium desbloquea instantáneas ilimitadas para rastrear cambios, exportación CSV de tus datos y una línea de tiempo completa del historial de cambios mostrando nuevos que dejaron de seguirte y nuevos seguidores.',
  'premium.title': 'Rastrea cambios a lo largo del tiempo',
  'premium.subtitle': 'Actualiza para ver quién dejó de seguirte y exportar tus datos.',
  'premium.monthly': '$3.99 / mes',
  'premium.yearly': '$19.99 / año',
  'premium.save': 'Ahorra 58%',
  'premium.feature1': 'Instantáneas ilimitadas',
  'premium.feature2': 'Exportación CSV',
  'premium.feature3': 'Línea de tiempo de cambios',
  'premium.cta': 'Obtener Premium',
  'premium.monthly_available': '{price} also available',
  'upload.title': 'Sube tus datos de Instagram',
  'upload.subtitle': 'Tu archivo se procesa 100% en tu dispositivo. Nada se sube a nuestros servidores.',
  'upload.drag': 'Arrastra y suelta tu archivo aquí',
  'upload.or': 'o',
  'upload.browse': 'Explorar archivos',
  'upload.formats': 'Acepta archivos .zip o .json de la exportación de datos de Instagram',
  'upload.processing': 'Procesando tu archivo…',
  'upload.error.invalid': 'Formato de archivo inválido. Por favor sube un archivo .zip o .json de Instagram.',
  'upload.error.missing': 'No se encontraron datos de seguidores/seguidos en el archivo. Asegúrate de haber descargado la exportación correcta de Instagram.',
  'dashboard.tab.nonfollowers': 'No te siguen',
  'dashboard.tab.changes': 'Cambios',
  'dashboard.nonfollowers.title': 'Cuentas que no te siguen de vuelta',
  'dashboard.nonfollowers.empty': '¡Todos a quienes sigues también te siguen! 🎉',
  'dashboard.nonfollowers.count': '{count} cuentas no te siguen de vuelta',
  'dashboard.changes.title': 'Cambios desde la última instantánea',
  'dashboard.changes.locked': 'Actualiza para ver quién dejó de seguirte desde tu última instantánea.',
  'dashboard.changes.unlock': 'Desbloquear cambios',
  'dashboard.changes.new_unfollowers': 'Nuevos que dejaron de seguirte',
  'dashboard.changes.new_followers': 'Nuevos seguidores',
  'dashboard.export': 'Exportar CSV',
  'dashboard.snapshot.save': 'Guardar instantánea',
  'dashboard.snapshot.update': 'Actualizar instantánea',
  'snapshots.title': 'Tus instantáneas',
  'snapshots.subtitle': 'Compara instantáneas para rastrear quién dejó de seguirte.',
  'snapshots.empty': 'Aún no hay instantáneas. Sube tus datos de Instagram para crear la primera.',
  'snapshots.compare': 'Comparar',
  'snapshots.delete': 'Eliminar',
  'snapshots.saved': '¡Instantánea guardada!',
  'snapshots.limit': 'Los usuarios gratuitos pueden guardar 1 instantánea. Actualiza a Premium para instantáneas ilimitadas.',
  'modal.title': 'Desbloquear funciones Premium',
  'modal.subtitle': 'Ve quién dejó de seguirte, exporta tus datos y rastrea cambios a lo largo del tiempo.',
  'modal.monthly_label': 'Mensual',
  'modal.yearly_label': 'Anual',
  'modal.yearly_save': 'Ahorra 58%',
  'modal.feature1': 'Instantáneas ilimitadas',
  'modal.feature2': 'Exportación CSV',
  'modal.feature3': 'Línea de tiempo de cambios',
  'modal.buy_monthly': 'Mensual — $3.99/mes',
  'modal.buy_yearly': 'Anual — $19.99/año',
  'modal.verify_title': '¿Ya compraste?',
  'modal.verify_placeholder': 'Ingresa tu email',
  'modal.verify_btn': 'Verificar',
  'modal.verify_success': '✓ ¡Premium activado!',
  'modal.verify_fail': 'Email no encontrado. Revisa el email con que compraste.',
  'guide.title': 'Cómo descargar tus datos de Instagram',
  'guide.subtitle': 'Sigue estos pasos para exportar tu lista de seguidores y seguidos de Instagram.',
  'guide.step1.title': 'Abre la configuración de Instagram',
  'guide.step1.desc': 'Toca tu foto de perfil → Menú (☰) → Configuración y privacidad → Tu actividad → Descargar tu información.',
  'guide.step2.title': 'Selecciona los datos a descargar',
  'guide.step2.desc': 'Elige "Parte de tu información" y selecciona solo "Seguidores y seguidos". Configura el formato como JSON.',
  'guide.step3.title': 'Solicita la descarga',
  'guide.step3.desc': 'Toca "Crear archivos". Instagram preparará tus datos — generalmente tarda unos minutos.',
  'guide.step4.title': 'Descarga y sube',
  'guide.step4.desc': 'Una vez listo, descarga el archivo ZIP. Luego regresa aquí y súbelo.',
  'guide.cta': 'Tengo mi archivo — Subir ahora',
  'footer.privacy': 'Política de privacidad',
  'footer.terms': 'Términos de servicio',
  'footer.guide': 'Guía de descarga',
  'footer.tagline': '100% privado. Sin inicio de sesión.',
  'common.loading': 'Cargando…',
  'common.error': 'Algo salió mal. Por favor intenta de nuevo.',
  'common.back': 'Atrás',
  'common.close': 'Cerrar',
  'common.or': 'o',
  'upload.snapshot_prompt': 'Sube otro archivo para comparar los cambios',
  'upload.new_file': 'Subir nuevo archivo',
  'footer.cancel': 'Cancelar suscripción',
  'cancel.title': 'Cancelar suscripción',
  'cancel.subtitle': 'Ingresa el correo electrónico que usaste para comprar SafeUnfollow Premium. Te enviaremos un código de confirmación antes de cancelar.',
  'cancel.email_label': 'Dirección de correo',
  'cancel.warning_title': 'Antes de cancelar',
  'cancel.warning1': 'Las instantáneas ilimitadas ya no estarán disponibles',
  'cancel.warning2': 'La exportación CSV será desactivada',
  'cancel.warning3': 'El seguimiento de cambios quedará bloqueado',
  'cancel.warning4': 'Esta acción no se puede deshacer',
  'cancel.sending': 'Enviando código…',
  'cancel.send_code': 'Enviar código de confirmación',
  'cancel.changed_mind': '¿Cambiaste de opinión?',
  'cancel.go_home': 'Volver al inicio',
  'cancel.check_email': 'Revisa tu correo',
  'cancel.code_sent': 'Enviamos un código de confirmación de 6 dígitos a:',
  'cancel.code_label': 'Código de confirmación',
  'cancel.code_expires': 'El código expira en 15 minutos.',
  'cancel.next': 'Siguiente',
  'cancel.different_email': 'Usar un correo diferente',
  'cancel.confirm_title': '¿Estás seguro?',
  'cancel.confirm_subtitle': 'Estás a punto de cancelar la suscripción de:',
  'cancel.confirm_warning': 'El acceso premium se eliminará inmediatamente. No recibirás un reembolso por el período de facturación actual.',
  'cancel.cancelling': 'Cancelando…',
  'cancel.confirm_btn': 'Sí, cancelar mi suscripción',
  'cancel.keep_btn': 'Mantener mi suscripción',
  'cancel.success_title': 'Suscripción cancelada',
  'cancel.success_subtitle': 'Tu acceso premium ha sido eliminado para:',
  'cancel.success_msg': 'Puedes seguir usando SafeUnfollow de forma gratuita. Si cambias de opinión, puedes volver a suscribirte en cualquier momento.',
  'cancel.back_btn': 'Volver a SafeUnfollow',
  'cancel.error_title': 'Algo salió mal',
  'cancel.try_again': 'Intentar de nuevo',
  'cancel.go_home_btn': 'Ir al inicio',
  'cancel.invalid_email': 'Por favor ingresa una dirección de correo válida.',
  'cancel.network_error': 'Error de red. Por favor verifica tu conexión e intenta de nuevo.',
};

export const translations: Record<Lang, Translations> = { en, ko, ja, es };
