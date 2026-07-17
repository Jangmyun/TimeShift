"use client";

import { useState } from "react";
import { Button, TextInput, Textarea } from "krds-react";

interface ContactForm {
  name: string;
  email: string;
  message: string;
}

const INITIAL_FORM: ContactForm = { name: "", email: "", message: "" };

export default function ContactPage() {
  const [form, setForm] = useState<ContactForm>(INITIAL_FORM);
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    console.log("문의하기 제출:", form);
    setSubmitted(true);
    setForm(INITIAL_FORM);
  }

  return (
    <main className="flex flex-1 flex-col items-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-2xl font-bold">문의하기</h1>
        <p className="mt-2 text-gray-600">
          타임시프트 서비스에 대해 궁금한 점을 남겨 주시면 확인 후 답변드리겠습니다.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-md flex-col gap-4"
      >
        <TextInput
          label="이름"
          name="name"
          value={form.name}
          onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
          placeholder="이름을 입력해 주세요"
          required
        />
        <TextInput
          label="이메일"
          name="email"
          type="email"
          value={form.email}
          onChange={(value) => setForm((prev) => ({ ...prev, email: value }))}
          placeholder="example@email.com"
          required
        />
        <Textarea
          label="문의 내용"
          name="message"
          value={form.message}
          onChange={(value) =>
            setForm((prev) => ({ ...prev, message: value }))
          }
          placeholder="문의하실 내용을 입력해 주세요"
          rows={6}
          showCount
          countTotal={1000}
          maxLength={1000}
          required
        />
        <Button type="submit" variant="primary" size="large">
          제출
        </Button>
        {submitted && (
          <p className="text-center text-sm text-blue-600">
            문의가 접수되었습니다. (콘솔 로그를 확인해 주세요)
          </p>
        )}
      </form>
    </main>
  );
}
