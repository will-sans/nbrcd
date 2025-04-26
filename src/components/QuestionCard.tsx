import Link from "next/link"

interface QuestionProps {
  text: string
  philosophy: string
  route: string
}

export default function QuestionCard({ text, philosophy, route }: QuestionProps) {
  return (
    <Link href={route}>
      <div className="border rounded-xl p-4 shadow hover:bg-gray-100 transition cursor-pointer">
        <p className="text-lg font-semibold">{text}</p>
        <span className="text-sm text-gray-500">{philosophy}</span>
      </div>
    </Link>
  )
}
