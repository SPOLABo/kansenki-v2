import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="px-6 py-12 max-w-2xl mx-auto text-gray-800 pb-0" style={{ paddingBottom: '400px' }}>
      <div className="mb-4">
        <Link
          href="/top-next"
          className="inline-flex items-center rounded-full border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 hover:bg-gray-50"
        >
          戻る
        </Link>
      </div>
      <h1 className="text-2xl font-bold mb-4">プライバシーポリシー</h1>
      <p className="mb-4">
        株式会社スポカレ（以下「当社」といいます。）は、当社が運営するサービス「スポカレコミュニティ」（以下「本サービス」といいます。）におけるユーザーの個人情報の取り扱いについて、以下のとおりプライバシーポリシー（以下「本ポリシー」といいます。）を定めます。
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">第1条（基本方針）</h2>
      <p className="mb-4">
        当社は、個人情報の保護に関する法律（以下「個人情報保護法」といいます。）その他の関係法令およびガイドラインを遵守し、本ポリシーに従ってユーザーの個人情報を適切に取り扱います。
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">第2条（取得する個人情報）</h2>
      <p className="mb-2">当社は、本サービスの提供にあたり、以下の情報を取得することがあります。</p>
      <div className="space-y-4">
        <div>
          <div className="font-semibold">1. アカウント情報</div>
          <div>
            ユーザーが本サービスにログインまたは登録する際に、以下の認証方式を通じて取得する情報。
          </div>
          <div className="mt-2">
            Google認証でログインした場合：Googleアカウントに登録された氏名、メールアドレス、プロフィール画像、Google ID等のうち、ユーザーが提供に同意した情報
          </div>
          <div className="mt-1">
            メールアドレス認証でログインした場合（将来提供予定）：メールアドレス、パスワード（ハッシュ化のうえ保存）
          </div>
          <div className="mt-1">
            その他のSNS認証でログインした場合（将来提供予定。X（旧Twitter）、Apple、Facebook等を想定）：各SNSサービスにおいてユーザーが提供に同意したプロフィール情報、メールアドレス、SNS上のユーザーID等
          </div>
        </div>

        <div>
          <div className="font-semibold">2. プロフィール情報</div>
          <div>
            ユーザーが任意で本サービス上に登録する、ニックネーム、自己紹介文、応援チーム、アイコン画像等の情報。
          </div>
        </div>

        <div>
          <div className="font-semibold">3. ユーザー投稿コンテンツ</div>
          <div>
            ユーザーが本サービスに投稿する観戦記、コメント、画像、参加イベント、タイムラインへの投稿等。これらに含まれる位置情報（観戦地・スタジアム情報等）、観戦日時、感想等の情報を含みます。
          </div>
        </div>

        <div>
          <div className="font-semibold">4. サービス利用情報</div>
          <div>ログイン履歴、閲覧履歴、参加イベント、いいねやフォロー等のアクション履歴、アクセス日時等。</div>
        </div>

        <div>
          <div className="font-semibold">5. 端末・接続情報</div>
          <div>IPアドレス、ブラウザの種類、OS、デバイス情報、リファラー、Cookie、広告識別子等。</div>
        </div>

        <div>
          <div className="font-semibold">6. お問い合わせ情報</div>
          <div>ユーザーが当社にお問い合わせいただいた際の氏名、メールアドレス、お問い合わせ内容等。</div>
        </div>
      </div>

      <h2 className="text-lg font-semibold mt-6 mb-2">第3条（個人情報の利用目的）</h2>
      <p className="mb-2">当社は、取得した個人情報を以下の目的で利用します。</p>
      <div className="space-y-1 mb-4">
        <div>本サービスの提供、維持、運営、改善のため</div>
        <div>ユーザー認証およびアカウント管理のため</div>
        <div>ユーザー間の交流機能（観戦記、タイムライン、イベント参加等）の提供のため</div>
        <div>ユーザーからのお問い合わせへの対応のため</div>
        <div>本サービスに関するお知らせ、メールマガジン、キャンペーン情報等の配信のため</div>
        <div>利用規約等に違反する行為への対応のため</div>
        <div>本サービスの利用状況の分析、新機能・新サービスの開発のため</div>
        <div>不正アクセス、不正利用の防止およびセキュリティ確保のため</div>
        <div>統計データの作成のため（個人を特定できない形に加工した上で利用します）</div>
        <div>その他、上記利用目的に付随する目的のため</div>
      </div>
      <p className="mb-4">
        利用目的を変更する場合は、変更後の目的について本サービス上で通知または公表します。
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">第4条（第三者提供）</h2>
      <p className="mb-2">当社は、以下の場合を除き、ユーザーの同意なく個人情報を第三者に提供しません。</p>
      <div className="space-y-1 mb-4">
        <div>法令に基づく場合</div>
        <div>人の生命、身体または財産の保護のために必要があり、ユーザーの同意を得ることが困難な場合</div>
        <div>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合</div>
        <div>国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合</div>
        <div>合併その他の事由による事業の承継に伴って個人情報が提供される場合</div>
        <div>個人情報保護法その他の法令で認められる場合</div>
      </div>

      <h2 className="text-lg font-semibold mt-6 mb-2">第5条（個人情報の取り扱いの委託）</h2>
      <p className="mb-4">
        当社は、利用目的の達成に必要な範囲内において、個人情報の取り扱いの全部または一部を外部に委託することがあります。この場合、当社は委託先に対して必要かつ適切な監督を行います。
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">第6条（外部サービスとの連携）</h2>
      <p className="mb-2">
        本サービスは、ユーザーの利便性向上のため、Googleその他の外部サービス（以下「外部サービス」といいます。）と連携しています。
        ユーザーが外部サービスのアカウントを用いて本サービスにログインする場合、当社は当該外部サービスから、ユーザーが提供に同意した情報を取得します。
        外部サービスにおける個人情報の取り扱いについては、各外部サービスのプライバシーポリシーをご確認ください。
      </p>
      <p className="mb-2">主な連携先：</p>
      <p className="mb-4">
        Google LLC（Google認証）：https://policies.google.com/privacy
        <br />
        （将来的に追加予定の外部認証サービスも、提供開始時に本項に追記します）
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">第7条（Cookieおよび類似技術の利用）</h2>
      <p className="mb-4">
        本サービスでは、ユーザー体験の向上、ログイン状態の維持、利用状況の分析等を目的として、Cookieおよびこれに類する技術を使用しています。
        ユーザーはブラウザの設定によりCookieの受け入れを拒否することができますが、その場合、本サービスの一部機能をご利用いただけない可能性があります。
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">第8条（アクセス解析ツール）</h2>
      <p className="mb-4">
        本サービスでは、サービス改善のためにアクセス解析ツールを使用することがあります。これらのツールはCookie等を用いてアクセス情報を収集しますが、個人を特定する情報は含みません。
        利用するアクセス解析ツールおよびそのプライバシーポリシーについては、提供開始時に本項に明記します（例：Google Analytics、https://policies.google.com/privacy）。
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">第9条（個人情報の安全管理）</h2>
      <p className="mb-4">
        当社は、取得した個人情報について、漏えい、滅失、毀損等を防止するため、技術的および組織的に必要かつ適切な安全管理措置を講じます。パスワード等の認証情報については、暗号化またはハッシュ化により保護します。
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">第10条（個人情報の開示・訂正・利用停止等）</h2>
      <p className="mb-4">
        ユーザーは、当社に対して、個人情報保護法の定めに基づき、自己の個人情報について開示、訂正、追加、削除、利用停止、第三者提供の停止等を請求することができます。
        請求の際は、第13条のお問い合わせ窓口までご連絡ください。当社は、本人確認を行った上で、法令に従い対応いたします。
        なお、本サービスのアカウント削除（退会）については、本サービス内のマイページから手続きいただけます。アカウント削除後の投稿コンテンツの取り扱いについては、利用規約に従います。
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">第11条（未成年者の個人情報）</h2>
      <p className="mb-4">
        未成年者が本サービスを利用する場合、保護者等の法定代理人の同意を得たうえでご利用ください。13歳未満のユーザーについては、保護者等の同意なく個人情報を提供しないでください。
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">第12条（プライバシーポリシーの変更）</h2>
      <p className="mb-4">
        当社は、法令の改正、本サービスの内容変更、その他の理由により、本ポリシーを変更することがあります。重要な変更を行う場合は、本サービス上での通知その他適切な方法により告知します。変更後のプライバシーポリシーは、本サービス上に掲載した時点から効力を生じるものとします。
      </p>

      <h2 className="text-lg font-semibold mt-6 mb-2">第13条（お問い合わせ窓口）</h2>
      <p className="mb-4">
        本ポリシーに関するお問い合わせ、個人情報の取り扱いに関するご請求等は、以下の窓口までご連絡ください。
        <br />
        運営者：株式会社スポカレ
        <br />
        所在地：〒105-0011 東京都港区芝公園2-3-3　寺田ビル8F
        <br />
        連絡先：info@spocale.com
        <br />
        個人情報保護管理者：株式会社スポカレ 個人情報苦情相談窓口
      </p>

      <div className="mt-10 text-sm text-gray-500">制定日：2026年4月27日</div>
    </div>
  );
}
