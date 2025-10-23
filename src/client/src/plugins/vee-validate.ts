import { defineRule, configure } from 'vee-validate';
import { required, email, min, confirmed } from '@vee-validate/rules';

export function setupValidation() {
  defineRule('required', required);
  defineRule('email', email);
  defineRule('min', min);
  defineRule('confirmed', confirmed);

  configure({
    generateMessage: (context) => {
      const messages: Record<string, string> = {
        required: `Pole jest wymagane`,
        email: `Niepoprawny format emaila`,
        min: `Pole musi mieć przynajmniej 0:{min} znaków`,
        confirmed: `Pola muszą się zgadzać`,
      };
      const message = messages[context.rule?.name ?? ''] || `Pole jest nieprawidłowe`;
      return message;
    },
  });
}