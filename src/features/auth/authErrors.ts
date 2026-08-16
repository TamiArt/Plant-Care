export interface AuthApiError {
  code?: string;
  message?: string;
  status?: number;
  statusText?: string;
}

export function getAuthErrorMessage(
  error: AuthApiError | null | undefined,
  fallback: string,
): string {
  switch (error?.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "Неверная почта или пароль. Проверьте раскладку клавиатуры и введённый адрес.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "Аккаунт с этой почтой уже существует. Переключитесь на вкладку входа.";
    case "INVALID_ORIGIN":
    case "MISSING_OR_NULL_ORIGIN":
      return "Сервер отклонил адрес приложения. Откройте PlantCare по основному адресу и повторите вход.";
    case "TOO_MANY_REQUESTS":
      return "Слишком много попыток входа. Подождите несколько минут и попробуйте снова.";
    default:
      break;
  }

  if (error?.status === 429) {
    return "Слишком много попыток входа. Подождите несколько минут и попробуйте снова.";
  }

  if (error?.status && error.status >= 500) {
    return "Сервер аккаунтов временно не отвечает. Локальные растения сохранены; повторите попытку позже.";
  }

  return error?.message || fallback;
}
