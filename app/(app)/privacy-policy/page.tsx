'use client';

import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="relative min-h-screen bg-transparent overflow-hidden">
      {/* Animated Gradient Glows - Blue to Purple */}
      <div className="absolute top-20 left-1/4 w-96 h-96 bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] rounded-full blur-3xl opacity-10 animate-pulse"></div>
      <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] rounded-full blur-3xl opacity-10 animate-pulse" style={{animationDelay: '2s'}}></div>

      <main className="relative z-10 pt-12 pb-20 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4 bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] bg-clip-text text-transparent">
            Legal Policies
          </h1>
          <p className="text-lg text-white/50">Read about our terms and how we protect your information</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center gap-4 mb-12">
          <Link
            href="/terms-of-service"
            className="px-8 py-3 rounded-2xl border border-[#3B82F6]/30 text-[#3B82F6] font-semibold hover:border-[#3B82F6] hover:text-white hover:bg-[#3B82F6]/10 transition-all duration-300"
          >
            Terms of Service
          </Link>
          <div className="px-8 py-3 rounded-2xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white font-semibold shadow-lg shadow-[#3B82F6]/20">
            Privacy Policy
          </div>
        </div>

        {/* Content Card */}
        <div className="max-w-4xl mx-auto backdrop-blur-xl bg-[#0a0a0a]/80 border border-white/5 rounded-2xl p-8 sm:p-12 shadow-2xl hover:border-[#3B82F6]/20 transition-all duration-300">
          <h2 className="text-4xl font-bold text-white mb-2">Mr. Cash – Privacy Policy</h2>
          <p className="text-white/40 mb-8">Effective Date: 03/24/2026</p>

          {/* Section 1 */}
          <div className="mb-10">
            <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-4">
              <span className="w-1 h-8 bg-gradient-to-b from-[#3B82F6] to-[#8B5CF6] rounded-full"></span>
              1. Introduction
            </h3>
            <p className="text-white/70 leading-relaxed">
              At Mr. Cash, we are committed to protecting your privacy and ensuring you have a positive experience on our platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website Mr. Cash.com, including any other media form, media channel, mobile website, or mobile application.
            </p>
          </div>

          {/* Section 2 */}
          <div className="mb-10">
            <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-4">
              <span className="w-1 h-8 bg-gradient-to-b from-[#3B82F6] to-[#8B5CF6] rounded-full"></span>
              2. Information We Collect
            </h3>
            <p className="text-white/70 leading-relaxed mb-4">We may collect information about you in a variety of ways. The information we may collect on the Site includes:</p>
            <ul className="space-y-3 text-white/70">
              <li className="flex items-start gap-3"><span className="text-[#3B82F6] font-bold mt-1">•</span> <span><strong className="text-white">Personal Data:</strong> Personally identifiable information, such as your name, shipping address, email address, and telephone number, and demographic information, such as your age, gender, hometown, and interests, that you voluntarily give to us</span></li>
              <li className="flex items-start gap-3"><span className="text-[#3B82F6] font-bold mt-1">•</span> <span><strong className="text-white">Financial Data:</strong> Financial information, such as data related to your payment method (e.g., valid credit card number, card brand, expiration date) that we may collect when you purchase or attempt to purchase services from the Site</span></li>
              <li className="flex items-start gap-3"><span className="text-[#3B82F6] font-bold mt-1">•</span> <span><strong className="text-white">Data From Third Parties:</strong> Information received from public databases, joint marketing partners, social media platforms, as well as from other third parties</span></li>
            </ul>
          </div>

          {/* Section 3 */}
          <div className="mb-10">
            <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-4">
              <span className="w-1 h-8 bg-gradient-to-b from-[#3B82F6] to-[#8B5CF6] rounded-full"></span>
              3. Use of Your Information
            </h3>
            <p className="text-white/70 leading-relaxed mb-4">Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Site to:</p>
            <ul className="space-y-2 text-white/70">
              <li className="flex items-start gap-3"><span className="text-[#3B82F6] font-bold mt-1">•</span> Generate a personal profile about you so that future visits to the Site will be personalized</li>
              <li className="flex items-start gap-3"><span className="text-[#3B82F6] font-bold mt-1">•</span> Increase the efficiency and operation of the Site</li>
              <li className="flex items-start gap-3"><span className="text-[#3B82F6] font-bold mt-1">•</span> Monitor and analyze usage and trends to improve your experience with the Site</li>
              <li className="flex items-start gap-3"><span className="text-[#3B82F6] font-bold mt-1">•</span> Perform other business activities as necessary</li>
            </ul>
          </div>

          {/* Section 4 */}
          <div className="mb-10">
            <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-4">
              <span className="w-1 h-8 bg-gradient-to-b from-[#3B82F6] to-[#8B5CF6] rounded-full"></span>
              4. Disclosure of Your Information
            </h3>
            <p className="text-white/70 leading-relaxed mb-4">
              We may share information we have collected about you in certain situations:
            </p>
            <ul className="space-y-2 text-white/70">
              <li className="flex items-start gap-3"><span className="text-[#3B82F6] font-bold mt-1">•</span> <strong className="text-white">By Law or to Protect Rights:</strong> If we believe the release of information is necessary to comply with the law</li>
              <li className="flex items-start gap-3"><span className="text-[#3B82F6] font-bold mt-1">•</span> <strong className="text-white">Third-Party Service Providers:</strong> We may share your information with third parties that perform services for us, subject to confidentiality agreements</li>
              <li className="flex items-start gap-3"><span className="text-[#3B82F6] font-bold mt-1">•</span> <strong className="text-white">Business Transfers:</strong> If Mr. Cash is involved in a merger, acquisition, or asset sale, your information may be transferred</li>
            </ul>
          </div>

          {/* Section 5 */}
          <div className="mb-10">
            <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-4">
              <span className="w-1 h-8 bg-gradient-to-b from-[#3B82F6] to-[#8B5CF6] rounded-full"></span>
              5. Security of Your Information
            </h3>
            <p className="text-white/70 leading-relaxed">
              We use administrative, technical, and physical security measures to help protect your personal information. However, no method of transmission over the Internet or method of electronic storage is 100% secure. Therefore, while we strive to use commercially acceptable means to protect your personal information, we cannot guarantee its absolute security.
            </p>
          </div>

          {/* Section 6 */}
          <div className="mb-10">
            <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-4">
              <span className="w-1 h-8 bg-gradient-to-b from-[#3B82F6] to-[#8B5CF6] rounded-full"></span>
              6. Contact Us Regarding Privacy
            </h3>
            <p className="text-white/70 leading-relaxed">
              If you have questions or comments about this Privacy Policy, please contact us at privacy@mrcash.com.
            </p>
          </div>

          {/* Section 7 */}
          <div className="mb-10">
            <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-4">
              <span className="w-1 h-8 bg-gradient-to-b from-[#3B82F6] to-[#8B5CF6] rounded-full"></span>
              7. CCPA Privacy Rights
            </h3>
            <p className="text-white/70 leading-relaxed mb-4">
              If you are a California resident, you are entitled to learn what data Mr. Cash collects about you, ask to delete your data, and opt-out of the sale of your information. To submit your data deletion request and to learn more about your privacy rights, please contact us at privacy@mrcash.com.
            </p>
          </div>

          {/* Section 8 */}
          <div className="mb-10">
            <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-4">
              <span className="w-1 h-8 bg-gradient-to-b from-[#3B82F6] to-[#8B5CF6] rounded-full"></span>
              8. Updates to Our Privacy Policy
            </h3>
            <p className="text-white/70 leading-relaxed">
              Mr. Cash may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any changes by updating the effective date of this Privacy Policy. Your continued use of the Site following the posting of the revised Privacy Policy means that you accept and agree to the changes.
            </p>
          </div>

          {/* Section 9 */}
          <div className="mb-10">
            <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-4">
              <span className="w-1 h-8 bg-gradient-to-b from-[#3B82F6] to-[#8B5CF6] rounded-full"></span>
              9. Your Rights
            </h3>
            <p className="text-white/70 leading-relaxed mb-4">
              Depending on your jurisdiction, you may have the right to:
            </p>
            <ul className="space-y-2 text-white/70">
              <li className="flex items-start gap-3"><span className="text-[#3B82F6] font-bold mt-1">•</span> Access the personal data we hold about you</li>
              <li className="flex items-start gap-3"><span className="text-[#3B82F6] font-bold mt-1">•</span> Request correction of inaccurate personal data</li>
              <li className="flex items-start gap-3"><span className="text-[#3B82F6] font-bold mt-1">•</span> Request deletion of your personal data</li>
              <li className="flex items-start gap-3"><span className="text-[#3B82F6] font-bold mt-1">•</span> Opt-out of direct marketing communications</li>
            </ul>
          </div>

          {/* Section 10 */}
          <div className="mb-10">
            <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-4">
              <span className="w-1 h-8 bg-gradient-to-b from-[#3B82F6] to-[#8B5CF6] rounded-full"></span>
              10. Cookies and Tracking Technologies
            </h3>
            <p className="text-white/70 leading-relaxed">
              Mr. Cash may use cookies, web beacons, and similar tracking technologies to enhance your user experience. These technologies help us understand how you use our Site and allow us to personalize content and advertising.
            </p>
          </div>

          {/* Section 11 */}
          <div className="mb-10">
            <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-4">
              <span className="w-1 h-8 bg-gradient-to-b from-[#3B82F6] to-[#8B5CF6] rounded-full"></span>
              11. Children&apos;s Privacy
            </h3>
            <p className="text-white/70 leading-relaxed">
              Mr. Cash does not knowingly collect personal information from children under the age of 13. If we become aware that a child under 13 has provided us with personal information, we will delete such information and terminate the child&apos;s account immediately.
            </p>
          </div>
        </div>

        {/* Navigation Link at Bottom */}
        <div className="flex justify-center mt-12">
          <Link
            href="/terms-of-service"
            className="px-12 py-3 rounded-2xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white font-semibold hover:shadow-lg hover:shadow-[#3B82F6]/30 transition-all duration-300"
          >
            View Terms of Service
          </Link>
        </div>
      </main>
    </div>
  );
}
