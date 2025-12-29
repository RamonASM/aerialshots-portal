'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  CreditCard,
  Split,
  Check,
  AlertCircle,
  Loader2,
  Plus,
  Minus,
  DollarSign,
  Percent,
} from 'lucide-react'

interface SplitPaymentFormProps {
  orderId: string
  totalAmountCents: number
  onPaymentComplete?: () => void
}

interface Portion {
  id?: string
  amountCents: number
  percentage: number
  status: 'pending' | 'processing' | 'succeeded' | 'failed'
  cardBrand?: string
  cardLastFour?: string
}

type SplitType = 'even' | 'custom' | 'percentage'

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: CreditCard },
  processing: { label: 'Processing', color: 'bg-blue-100 text-blue-700', icon: Loader2 },
  succeeded: { label: 'Paid', color: 'bg-green-100 text-green-700', icon: Check },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: AlertCircle },
}

function formatAmount(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100)
}

export function SplitPaymentForm({
  orderId,
  totalAmountCents,
  onPaymentComplete,
}: SplitPaymentFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'configure' | 'pay'>('configure')

  const [splitType, setSplitType] = useState<SplitType>('even')
  const [numberOfPortions, setNumberOfPortions] = useState(2)
  const [portions, setPortions] = useState<Portion[]>([])
  const [splitPaymentId, setSplitPaymentId] = useState<string | null>(null)

  // Custom amounts for 'custom' split type
  const [customAmounts, setCustomAmounts] = useState<number[]>([0, 0])
  // Percentages for 'percentage' split type
  const [percentages, setPercentages] = useState<number[]>([50, 50])

  const calculateEvenPortions = useCallback(() => {
    const baseAmount = Math.floor(totalAmountCents / numberOfPortions)
    const remainder = totalAmountCents % numberOfPortions

    return Array.from({ length: numberOfPortions }, (_, i) => ({
      amountCents: i === 0 ? baseAmount + remainder : baseAmount,
      percentage: Number((((i === 0 ? baseAmount + remainder : baseAmount) / totalAmountCents) * 100).toFixed(2)),
      status: 'pending' as const,
    }))
  }, [totalAmountCents, numberOfPortions])

  const handleCreateSplitPayment = async () => {
    setLoading(true)
    setError(null)

    try {
      let portionsData

      switch (splitType) {
        case 'even':
          portionsData = calculateEvenPortions().map((p) => ({
            amountCents: p.amountCents,
            percentage: p.percentage,
          }))
          break

        case 'percentage':
          portionsData = percentages.map((p) => ({ percentage: p }))
          break

        case 'custom':
          portionsData = customAmounts.map((a) => ({ amountCents: a }))
          break
      }

      const response = await fetch('/api/payments/split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          splitType,
          portions: portionsData,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create split payment')
      }

      const data = await response.json()
      setSplitPaymentId(data.splitPayment.id)
      setPortions(
        data.portions.map((p: {
          id: string
          amount_cents: number
          percentage: number
          status: string
          card_brand?: string
          card_last_four?: string
        }) => ({
          id: p.id,
          amountCents: p.amount_cents,
          percentage: p.percentage || 0,
          status: p.status,
          cardBrand: p.card_brand,
          cardLastFour: p.card_last_four,
        }))
      )
      setStep('pay')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdatePortionCount = (delta: number) => {
    const newCount = Math.max(2, Math.min(4, numberOfPortions + delta))
    setNumberOfPortions(newCount)

    if (splitType === 'custom') {
      if (delta > 0) {
        setCustomAmounts([...customAmounts, 0])
      } else {
        setCustomAmounts(customAmounts.slice(0, -1))
      }
    }

    if (splitType === 'percentage') {
      const evenPercent = Math.floor(100 / newCount)
      const remainder = 100 % newCount
      const newPercentages = Array.from({ length: newCount }, (_, i) =>
        i === 0 ? evenPercent + remainder : evenPercent
      )
      setPercentages(newPercentages)
    }
  }

  const handleCustomAmountChange = (index: number, value: number) => {
    const newAmounts = [...customAmounts]
    newAmounts[index] = Math.round(value * 100) // Convert dollars to cents
    setCustomAmounts(newAmounts)
  }

  const handlePercentageChange = (index: number, value: number) => {
    const newPercentages = [...percentages]
    newPercentages[index] = value
    setPercentages(newPercentages)
  }

  const customTotal = customAmounts.reduce((sum, a) => sum + a, 0)
  const percentageTotal = percentages.reduce((sum, p) => sum + p, 0)
  const isCustomValid = customTotal === totalAmountCents
  const isPercentageValid = Math.abs(percentageTotal - 100) < 0.01

  const paidAmount = portions
    .filter((p) => p.status === 'succeeded')
    .reduce((sum, p) => sum + p.amountCents, 0)
  const remainingAmount = totalAmountCents - paidAmount
  const allPaid = portions.length > 0 && portions.every((p) => p.status === 'succeeded')

  if (allPaid) {
    onPaymentComplete?.()
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Split className="h-4 w-4 mr-2" />
          Split Payment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Split Payment</DialogTitle>
          <DialogDescription>
            Pay {formatAmount(totalAmountCents)} with multiple cards
          </DialogDescription>
        </DialogHeader>

        {step === 'configure' ? (
          <div className="space-y-6 py-4">
            {/* Split Type Selection */}
            <div className="space-y-2">
              <Label>How would you like to split the payment?</Label>
              <Select
                value={splitType}
                onValueChange={(value: SplitType) => setSplitType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="even">
                    <div className="flex items-center gap-2">
                      <Split className="h-4 w-4" />
                      Even Split
                    </div>
                  </SelectItem>
                  <SelectItem value="percentage">
                    <div className="flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      By Percentage
                    </div>
                  </SelectItem>
                  <SelectItem value="custom">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Custom Amounts
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Number of Portions */}
            <div className="space-y-2">
              <Label>Number of payments</Label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleUpdatePortionCount(-1)}
                  disabled={numberOfPortions <= 2}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-2xl font-bold w-8 text-center">
                  {numberOfPortions}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleUpdatePortionCount(1)}
                  disabled={numberOfPortions >= 4}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Preview */}
            <div className="space-y-3">
              <Label>Payment breakdown</Label>

              {splitType === 'even' && (
                <div className="space-y-2">
                  {calculateEvenPortions().map((portion, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-neutral-400" />
                        <span className="font-medium">Card {index + 1}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatAmount(portion.amountCents)}</p>
                        <p className="text-xs text-neutral-500">
                          {portion.percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {splitType === 'percentage' && (
                <div className="space-y-2">
                  {percentages.map((percentage, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <CreditCard className="h-4 w-4 text-neutral-400" />
                        <span className="font-medium">Card {index + 1}</span>
                      </div>
                      <Input
                        type="number"
                        min="1"
                        max="99"
                        value={percentage}
                        onChange={(e) =>
                          handlePercentageChange(index, Number(e.target.value))
                        }
                        className="w-20 text-center"
                      />
                      <span className="text-neutral-500">%</span>
                      <div className="flex-1 text-right">
                        <p className="font-bold">
                          {formatAmount(Math.round((totalAmountCents * percentage) / 100))}
                        </p>
                      </div>
                    </div>
                  ))}
                  {!isPercentageValid && (
                    <p className="text-sm text-red-600">
                      Percentages must total 100% (currently {percentageTotal}%)
                    </p>
                  )}
                </div>
              )}

              {splitType === 'custom' && (
                <div className="space-y-2">
                  {customAmounts.map((amount, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-neutral-50 rounded-lg"
                    >
                      <div className="flex items-center gap-2 min-w-[100px]">
                        <CreditCard className="h-4 w-4 text-neutral-400" />
                        <span className="font-medium">Card {index + 1}</span>
                      </div>
                      <span className="text-neutral-500">$</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={(amount / 100).toFixed(2)}
                        onChange={(e) =>
                          handleCustomAmountChange(index, Number(e.target.value))
                        }
                        className="w-28"
                      />
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-neutral-500">Total</span>
                    <span
                      className={`font-bold ${
                        isCustomValid ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {formatAmount(customTotal)} / {formatAmount(totalAmountCents)}
                    </span>
                  </div>
                  {!isCustomValid && (
                    <p className="text-sm text-red-600">
                      Amounts must equal the order total
                    </p>
                  )}
                </div>
              )}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateSplitPayment}
                disabled={
                  loading ||
                  (splitType === 'custom' && !isCustomValid) ||
                  (splitType === 'percentage' && !isPercentageValid)
                }
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Continue to Payment
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Payment Progress */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Payment Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-neutral-500">Paid</span>
                  <span className="font-bold text-green-600">
                    {formatAmount(paidAmount)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Remaining</span>
                  <span className="font-bold">{formatAmount(remainingAmount)}</span>
                </div>
                <div className="mt-3 h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{
                      width: `${(paidAmount / totalAmountCents) * 100}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Portions */}
            <div className="space-y-3">
              {portions.map((portion, index) => {
                const statusConfig = STATUS_CONFIG[portion.status]
                const StatusIcon = statusConfig.icon

                return (
                  <Card key={portion.id || index}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-neutral-100 rounded-lg">
                            <CreditCard className="h-5 w-5 text-neutral-600" />
                          </div>
                          <div>
                            <p className="font-medium">Payment {index + 1}</p>
                            <p className="text-sm text-neutral-500">
                              {formatAmount(portion.amountCents)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {portion.cardLastFour && (
                            <span className="text-sm text-neutral-500">
                              ****{portion.cardLastFour}
                            </span>
                          )}
                          <Badge className={statusConfig.color}>
                            <StatusIcon
                              className={`h-3 w-3 mr-1 ${
                                portion.status === 'processing' ? 'animate-spin' : ''
                              }`}
                            />
                            {statusConfig.label}
                          </Badge>
                        </div>
                      </div>

                      {portion.status === 'pending' && (
                        <div className="mt-4">
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              // In a real implementation, this would open a Stripe card element
                              // For now, show a placeholder
                              alert(
                                'This would open a Stripe payment form for this portion'
                              )
                            }}
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Pay {formatAmount(portion.amountCents)}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {allPaid && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                <Check className="h-8 w-8 mx-auto text-green-600 mb-2" />
                <p className="font-medium text-green-700">Payment Complete!</p>
                <p className="text-sm text-green-600 mt-1">
                  All portions have been paid successfully
                </p>
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setStep('configure')}
                disabled={portions.some((p) => p.status === 'succeeded')}
              >
                Back
              </Button>
              <Button onClick={() => setIsOpen(false)}>
                {allPaid ? 'Done' : 'Close'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
