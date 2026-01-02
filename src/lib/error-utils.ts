export function translateAuthError(message: string): string {
    const msg = message.toLowerCase();

    if (msg.includes("invalid login credentials")) {
        return "メールアドレスまたはパスワードが間違っています";
    }
    if (msg.includes("user already registered")) {
        return "このメールアドレスは既に登録されています";
    }
    if (msg.includes("password should be at least")) {
        return "パスワードは6文字以上で入力してください";
    }
    if (msg.includes("email not confirmed")) {
        return "メールアドレスの確認が完了していません";
    }
    if (msg.includes("rate limit exceeded")) {
        return "試行回数が多すぎます。しばらく待ってから再度お試しください";
    }
    if (msg.includes("weak password")) {
        return "パスワードが脆弱です。より複雑なパスワードを設定してください";
    }
    if (msg.includes("already a member")) {
        return "既にこの家族のメンバーです";
    }
    if (msg.includes("user not found")) {
        return "ユーザーが見つかりません";
    }
    if (msg.includes("network error")) {
        return "通信エラーが発生しました。インターネット接続を確認してください";
    }
    if (msg.includes("failed to fetch")) {
        return "通信に失敗しました";
    }

    // Default: Return original or a generic message if it looks like a system error
    return message;
}
