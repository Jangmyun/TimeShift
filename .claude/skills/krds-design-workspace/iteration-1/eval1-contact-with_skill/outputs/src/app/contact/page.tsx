"use client";

import { useState, type FormEvent } from "react";
import { Button, TextInput, Textarea } from "krds-react";

interface ContactFormData {
  name: string;
  email: string;
  message: string;
}

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const data: ContactFormData = { name, email, message };
    console.log("문의하기 제출:", data);

    setSubmitted(true);
  }

  return (
    <main className="mx-auto flex w-full max-w-[600px] flex-col gap-8 px-5 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-[var(--krds-color-light-gray-100,#1c1c1c)]">
          문의하기
        </h1>
        <p className="text-[var(--krds-color-light-gray-70,#565656)]">
          궁금한 점이나 의견을 남겨주시면 확인 후 답변드리겠습니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <TextInput
          label="이름"
          placeholder="이름을 입력해 주세요"
          value={name}
          onChange={setName}
          required
        />

        <TextInput
          type="email"
          label="이메일"
          placeholder="example@email.com"
          value={email}
          onChange={setEmail}
          required
        />

        <Textarea
          label="문의 내용"
          placeholder="문의하실 내용을 자세히 입력해 주세요"
          value={message}
          onChange={setMessage}
          rows={8}
          showCount
          countTotal={1000}
          maxLength={1000}
          required
        />

        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="large">
            제출하기
          </Button>
        </div>
      </form>

      {submitted && (
        <p
          role="status"
          className="text-[var(--krds-color-light-primary-50,#256ef4)]"
        >
          문의가 접수되었습니다. (콘솔 로그를 확인해 주세요)
        </p>
      )}
    </main>
  );
}
