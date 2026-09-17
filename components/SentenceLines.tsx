import { Fragment } from 'react';
import { splitSentences } from '@/utils/sentences';

// Renders each sentence of a copy string on its own line. Single sentences render unchanged.
export function SentenceLines({ text }: { text: string }) {
  const sentences = splitSentences(text);
  if (sentences.length <= 1) return <>{text}</>;
  return (
    <>
      {sentences.map((sentence, index) => (
        <Fragment key={index}>
          <span className="block">{sentence}</span>
        </Fragment>
      ))}
    </>
  );
}
