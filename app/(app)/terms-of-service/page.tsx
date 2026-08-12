'use client';

import Link from 'next/link';

export default function TermsOfService() {
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
          <div className="px-8 py-3 rounded-2xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white font-semibold shadow-lg shadow-[#3B82F6]/20">
            Terms of Service
          </div>
          <Link
            href="/privacy-policy"
            className="px-8 py-3 rounded-2xl border border-[#3B82F6]/30 text-[#3B82F6] font-semibold hover:border-[#3B82F6] hover:text-white hover:bg-[#3B82F6]/10 transition-all duration-300"
          >
            Privacy Policy
          </Link>
        </div>

        {/* Content Card */}
        <div className="max-w-4xl mx-auto backdrop-blur-xl bg-[#0a0a0a]/80 border border-white/5 rounded-2xl p-8 sm:p-12 shadow-2xl hover:border-[#3B82F6]/20 transition-all duration-300">
          <h2 className="text-4xl font-bold text-white mb-2">Mr. Cash – Terms of Service</h2>
          <p className="text-white/40 mb-8">Effective Date: 03/24/2026</p>

          {/* Section 1 */}
          <div className="mb-10">
            <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-4">
              <span className="w-1 h-8 bg-gradient-to-b from-[#3B82F6] to-[#8B5CF6] rounded-full"></span>
              1. Acceptance of Terms
            </h3>
            <p className="text-white/70 leading-relaxed mb-4">
              These Terms of Service (&quot;Terms&quot;) govern your access to and use of the website Mr. Cash.com (&quot;Website&quot;, &quot;Platform&quot;, &quot;Service&quot;). By accessing or using the Website, creating an account, or participating in any offers or reward programs, you agree to be bound by these Terms and our Privacy Policy.
            </p>
            <p className="text-white/70 leading-relaxed">
              If you do not agree with these Terms, you must not access or use the Website.
            </p>
          </div>

          {/* Section 2 */}
          <div className="mb-10">
            <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-4">
              <span className="w-1 h-8 bg-gradient-to-b from-[#3B82F6] to-[#8B5CF6] rounded-full"></span>
              2. Use License
            </h3>
            <p className="text-white/70 leading-relaxed">
              Mr. Cash grants you a limited, non-exclusive, non-transferable license to access and use the Website for personal, non-commercial purposes in accordance with these Terms. You agree not to reproduce, duplicate, copy, sell, resell, or exploit any portion of the Website without express written permission from Mr. Cash.
            </p>
          </div>

          {/* Section 3 */}
          <div className="mb-10">
            <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-4">
              <span className="w-1 h-8 bg-gradient-to-b from-[#3B82F6] to-[#8B5CF6] rounded-full"></span>
              3. User Accounts
            </h3>
            <p className="text-white/70 leading-relaxed mb-4">
              If you create an account on Mr. Cash, you are responsible for maintaining the confidentiality of your account information, including your password. You agree to accept responsibility for all activities that occur under your account. You must notify Mr. Cash immediately of any unauthorized use of your account or any other breach of security.
            </p>
            <p className="text-white/70 leading-relaxed">
              Mr. Cash reserves the right to refuse service, terminate accounts, or remove or edit content at any time for any reason.
            </p>
          </div>

          {/* Section 4 */}
          <div className="mb-10">
            <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-4">
              <span className="w-1 h-8 bg-gradient-to-b from-[#3B82F6] to-[#8B5CF6] rounded-full"></span>
              4. Prohibited Conduct
            </h3>
            <p className="text-white/70 leading-relaxed mb-4">You agree not to use Mr. Cash for any unlawful purposes or in any way that could damage or impair the service. Prohibited behavior includes:</p>
            <ul className="space-y-2 text-white/70">
              <li className="flex items-start gap-3"><span className="text-[#3B82F6] font-bold mt-1">•</span> Harassing or causing distress or inconvenience to any person</li>
              <li className="flex items-start gap-3"><span className="text-[#3B82F6] font-bold mt-1">•</span> Obscene or abusive language or behavior</li>
              <li className="flex items-start gap-3"><span className="text-[#3B82F6] font-bold mt-1">•</span> Disrupting the normal flow of dialogue within our website</li>
              <li className="flex items-start gap-3"><span className="text-[#3B82F6] font-bold mt-1">•</span> Attempting to gain unauthorized access to our systems</li>
            </ul>
          </div>

          {/* Section 5 */}
          <div className="mb-10">
            <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-4">
              <span className="w-1 h-8 bg-gradient-to-b from-[#3B82F6] to-[#8B5CF6] rounded-full"></span>
              5. Third-Party Links
            </h3>
            <p className="text-white/70 leading-relaxed">
              The Mr. Cash website may contain links to third-party websites. Mr. Cash is not responsible for the content, accuracy, or practices of these external sites. Your use of third-party websites is governed by their respective terms and privacy policies. We encourage you to review the policies of any third-party site before providing your personal information.
            </p>
          </div>

          {/* Section 6 */}
          <div className="mb-10">
            <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-4">
              <span className="w-1 h-8 bg-gradient-to-b from-[#3B82F6] to-[#8B5CF6] rounded-full"></span>
              6. Limitation of Liability
            </h3>
            <p className="text-white/70 leading-relaxed mb-4">
              Mr. Cash provides the Website on an &quot;as-is&quot; basis without warranties of any kind, either expressed or implied. We do not warrant that the Website will be uninterrupted, error-free, or free from harmful components.
            </p>
            <p className="text-white/70 leading-relaxed">
              In no event shall Mr. Cash be liable for any damages (including, without limitation, lost profits, lost data, or business interruption) arising out of or in connection with your use of the Website.
            </p>
          </div>

          {/* Section 7 */}
          <div className="mb-10">
            <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-4">
              <span className="w-1 h-8 bg-gradient-to-b from-[#3B82F6] to-[#8B5CF6] rounded-full"></span>
              7. Indemnification
            </h3>
            <p className="text-white/70 leading-relaxed">
              You agree to indemnify, defend, and hold harmless Mr. Cash and its officers, directors, employees, and agents from any and all claims, damages, losses, or expenses (including legal fees) arising from your use of the Website or your violation of these Terms.
            </p>
          </div>

          {/* Section 8 */}
          <div className="mb-10">
            <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-4">
              <span className="w-1 h-8 bg-gradient-to-b from-[#3B82F6] to-[#8B5CF6] rounded-full"></span>
              8. Modifications to Terms
            </h3>
            <p className="text-white/70 leading-relaxed">
              Mr. Cash reserves the right to modify these Terms at any time. Changes will be effective immediately upon posting to the Website. Your continued use of the Website following the posting of revised Terms means that you accept and agree to the changes.
            </p>
          </div>

          {/* Section 9 */}
          <div className="mb-10">
            <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-4">
              <span className="w-1 h-8 bg-gradient-to-b from-[#3B82F6] to-[#8B5CF6] rounded-full"></span>
              9. Governing Law
            </h3>
            <p className="text-white/70 leading-relaxed">
              These Terms are governed by and construed in accordance with the laws of the jurisdiction in which Mr. Cash operates, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
            </p>
          </div>

          {/* Section 10 */}
          <div className="mb-10">
            <h3 className="flex items-center gap-3 text-2xl font-bold text-white mb-4">
              <span className="w-1 h-8 bg-gradient-to-b from-[#3B82F6] to-[#8B5CF6] rounded-full"></span>
              10. Contact Us
            </h3>
            <p className="text-white/70 leading-relaxed">
              If you have any questions about these Terms of Service, please contact Mr. Cash at support@mrcash.com. We appreciate your understanding and commitment to our platform.
            </p>
          </div>
        </div>

        {/* Navigation Link at Bottom */}
        <div className="flex justify-center mt-12">
          <Link
            href="/privacy-policy"
            className="px-12 py-3 rounded-2xl bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white font-semibold hover:shadow-lg hover:shadow-[#3B82F6]/30 transition-all duration-300"
          >
            View Privacy Policy
          </Link>
        </div>
      </main>
    </div>
  );
}
