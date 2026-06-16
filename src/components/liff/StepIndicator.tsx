'use client'

import { Check } from 'lucide-react'

interface Step {
  label: string
  icon?: React.ReactNode
}

interface StepIndicatorProps {
  steps: Step[]
  currentStep: number
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-0">
      {steps.map((step, index) => {
        const isDone = index < currentStep
        const isActive = index === currentStep
        const isLast = index === steps.length - 1

        return (
          <div key={index} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  transition-all duration-300
                  ${isDone ? 'bg-emerald-500 text-white' : ''}
                  ${isActive ? 'bg-primary-600 text-white ring-4 ring-primary-100' : ''}
                  ${!isDone && !isActive ? 'bg-gray-200 text-gray-400' : ''}
                `}
              >
                {isDone ? <Check className="w-4 h-4"/> : index + 1}
              </div>
              <span className={`text-xs font-medium hidden sm:block
                ${isActive ? 'text-primary-600' : isDone ? 'text-emerald-500' : 'text-gray-400'}
              `}>
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div className={`w-12 sm:w-16 h-0.5 mx-1 mb-4 transition-colors duration-300
                ${index < currentStep ? 'bg-emerald-400' : 'bg-gray-200'}
              `}/>
            )}
          </div>
        )
      })}
    </div>
  )
}
