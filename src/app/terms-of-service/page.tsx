
"use client";

import { useRouter } from "next/navigation";
import { FaArrowLeft } from "react-icons/fa";

export default function TermsOfServicePage() {
  const router = useRouter();

  return (
    <div className="p-6 max-w-2xl mx-auto text-black bg-white min-h-screen dark:bg-gray-900 dark:text-gray-100 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => router.push("/settings")}
          className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          aria-label="設定に戻る"
        >
          <FaArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-semibold dark:text-gray-100">利用規約</h1>
        <div className="w-12" />
      </div>
      <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 space-y-4">
        <p className="text-sm font-semibold dark:text-gray-100">
          nbrcd 利用規約
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          WILLHUB（株式会社米田WILLHUB事業部。以下、「当社」といいます。）は、提供するサービス「nbrcd」（以下、「本サービス」といいます。）の利用に際し、以下の利用規約（以下、「本規約」といいます。）を定めます。本サービスを利用する前に、必ず本規約をお読みください。
        </p>
        <h2 className="text-base font-semibold dark:text-gray-100">1. 本規約の適用</h2>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          本規約は、本サービスの利用に関する全てのユーザーに適用されます。本サービスを利用することで、ユーザーは本規約に同意したものとみなされます。
        </p>
        <h2 className="text-base font-semibold dark:text-gray-100">2. ユーザー登録</h2>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          本サービスの利用には、ユーザー登録が必要です。ユーザーは、正確かつ最新の情報を提供し、登録情報の変更が生じた場合は速やかに更新する義務を負います。
        </p>
        <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300">
          <li>氏名、メールアドレスなどの基本情報の提供</li>
          <li>虚偽の情報提供の禁止</li>
          <li>登録情報の適切な管理</li>
        </ul>
        <h2 className="text-base font-semibold dark:text-gray-100">3. 禁止事項</h2>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          ユーザーは、本サービスの利用にあたり、以下の行為を行ってはなりません。
        </p>
        <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300">
          <li>法令または公序良俗に違反する行為</li>
          <li>本サービスの運営を妨害する行為（不正アクセス、過度な負荷をかける行為など）</li>
          <li>他のユーザーの個人情報を不正に収集・利用する行為</li>
          <li>当社または第三者の知的財産権を侵害する行為</li>
        </ul>
        <h2 className="text-base font-semibold dark:text-gray-100">4. サービスの提供および変更</h2>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          当社は、必要に応じて本サービスの内容を変更、停止、または終了する権利を有します。これによりユーザーに損害が生じた場合でも、当社は一切の責任を負いません。
        </p>
        <h2 className="text-base font-semibold dark:text-gray-100">5. 知的財産権</h2>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          本サービスに関する著作権、商標権、その他一切の知的財産権は、特段の記載がない限り当社または権利を有する第三者に帰属します。ユーザーは、私的使用の範囲を超えて無断で使用、複製、転用、転載、配布、販売、変更などを行うことはできません。
        </p>
        <h2 className="text-base font-semibold dark:text-gray-100">6. 免責事項</h2>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          当社は、本サービスの利用により生じた損害について、故意または重大な過失がある場合を除き、一切の責任を負いません。本サービスは「現状のまま」提供されるものであり、特定目的への適合性や完全性を保証するものではありません。
        </p>
        <h2 className="text-base font-semibold dark:text-gray-100">7. 本規約の変更</h2>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          当社は、法令や社会情勢の変化に応じて本規約を予告なく変更する場合があります。変更後の規約は本サービス内で公表し、公表時点で効力を生じます。
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          <strong>お問い合わせ窓口</strong><br />
          WILLHUB nbrcdサポート<br />
          Eメール：<a href="mailto:support@nbrcd.app" className="text-blue-500 hover:underline dark:text-blue-400 dark:hover:text-blue-300">support@nbrcd.app</a>
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300">制定日：2025年5月26日</p>
      </div>
    </div>
  );
}