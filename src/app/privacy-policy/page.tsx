"use client";

import { useRouter } from "next/navigation";

export default function PrivacyPolicyPage() {
  const router = useRouter();

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen flex flex-col relative">
      <div className="absolute top-4 left-4">
        <button
          onClick={() => router.push("/settings")}
          className="text-gray-600 hover:text-gray-800"
          aria-label="プライバシーポリシーを閉じる"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <h1 className="text-2xl font-bold mb-4 text-center">プライバシーポリシー</h1>
      <div className="space-y-4 text-gray-700">
        <p>
          <strong>nbrcd プライバシーポリシーおよび著作権等の権利関係について</strong>
        </p>
        <p>
          WILLHUB（株式会社米田WILLHUB事業部。以下、「当社」といいます。）は、提供するサービス「nbrcd」（以下、「本サービス」といいます。）の利用に際し、ユーザーの個人情報および著作権などの権利関係について以下の方針に従って適切に取り扱います。
        </p>
        <h2 className="text-lg font-semibold">1. 収集する個人情報</h2>
        <p>本サービスでは以下の情報を収集する場合があります。</p>
        <ul className="list-disc pl-5">
          <li>氏名・メールアドレスなどの基本情報</li>
          <li>利用履歴（アクセスログ、操作履歴など）</li>
          <li>ユーザーが本サービス上で入力した情報</li>
        </ul>
        <h2 className="text-lg font-semibold">2. 個人情報の利用目的</h2>
        <p>収集した情報は以下の目的で利用します。</p>
        <ul className="list-disc pl-5">
          <li>本サービスの提供、運営および改善のため</li>
          <li>ユーザーからのお問い合わせ対応のため</li>
          <li>新機能、更新情報、キャンペーンなどのご案内</li>
          <li>利用状況の分析によるサービスの向上</li>
        </ul>
        <h2 className="text-lg font-semibold">3. 個人情報の第三者への提供</h2>
        <p>当社は、次の場合を除き、個人情報を第三者に提供することはありません。</p>
        <ul className="list-disc pl-5">
          <li>ユーザー本人の同意がある場合</li>
          <li>法令に基づく場合</li>
          <li>人の生命、身体、財産の保護のために必要な場合</li>
        </ul>
        <h2 className="text-lg font-semibold">4. 個人情報の安全管理</h2>
        <p>当社は、収集した個人情報の漏洩、滅失または毀損の防止のため、適切な安全管理措置を講じます。</p>
        <h2 className="text-lg font-semibold">5. 個人情報の開示、訂正、削除</h2>
        <p>ユーザーは、自身の個人情報について、開示・訂正・削除を求めることができます。ご希望の場合は、以下の問い合わせ窓口までご連絡ください。</p>
        <h2 className="text-lg font-semibold">6. クッキー（Cookie）等の利用</h2>
        <p>本サービスでは、ユーザー体験向上や利便性のため、クッキーや類似技術を使用しています。ユーザーはブラウザの設定でこれらを拒否することが可能ですが、その場合、一部機能が制限される場合があります。</p>
        <h2 className="text-lg font-semibold">7. 著作権等の権利関係について</h2>
        <p>本サービスに関する著作権、商標権、その他一切の知的財産権は、特段の記載がない限り当社または権利を有する第三者に帰属します。ユーザーは、私的使用の範囲を超えて無断で使用、複製、転用、転載、配布、販売、変更などを行うことはできません。</p>
        <h2 className="text-lg font-semibold">8. プライバシーポリシーの変更</h2>
        <p>本ポリシーは、法令や社会情勢の変化に応じて予告なく変更する場合があります。変更後の内容は本サービス内で随時公表します。</p>
        <p>
          <strong>お問い合わせ窓口</strong><br />
          WILLHUB nbrcdサポート<br />
          Eメール：<a href="mailto:support@nbrcd.app" className="text-blue-500 hover:underline">support@nbrcd.app</a>
        </p>
        <p>制定日：2025年5月26日</p>
      </div>
    </div>
  );
}