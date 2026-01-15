import { useState } from "react";

export const CalculationCard = ({ question, correctValue, unit }: any) => {
    const [input, setInput] = useState("");
    const [feedback, setFeedback] = useState("");

    const checkAnswer = () => {
        // Allow for small margin of error (e.g. +/- 0.5)
        if (Math.abs(parseFloat(input) - correctValue) < 0.5) {
            setFeedback("Correct! 🎉");
        } else {
            setFeedback("Check your calculation. Did you remember to multiply by the degree of polymerization?");
        }
    };

    return (
        <div className="p-6 border rounded-xl bg-white shadow-sm">
            <h3 className="text-xl font-bold mb-4">{question}</h3>
            <div className="flex gap-2">
                <input
                    type="number"
                    className="border p-2 rounded w-32"
                    onChange={(e) => setInput(e.target.value)}
                />
                <span className="self-center font-bold text-slate-500">{unit}</span>
            </div>
            <button onClick={checkAnswer} className="mt-4 bg-green-500 text-white px-6 py-2 rounded-lg font-bold">
                Check
            </button>
            {feedback && <p className="mt-2 font-medium text-blue-600">{feedback}</p>}
        </div>
    );
};