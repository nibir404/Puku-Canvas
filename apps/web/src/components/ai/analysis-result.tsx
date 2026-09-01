import type { AnalysisResult } from '@puku/types';
import { Brain, Tags, Workflow, AlertTriangle, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';

interface Props {
  result: AnalysisResult;
}

export function AnalysisResultView({ result }: Props) {
  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold leading-tight">{result.title}</h2>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <ClassifiedBadge icon={FileText} label={result.canvasType.label} confidence={result.canvasType.confidence} />
          <ClassifiedBadge icon={Tags} label={result.domain.label} confidence={result.domain.confidence} />
          <ClassifiedBadge icon={Brain} label={result.concept.label} confidence={result.concept.confidence} />
        </div>
      </div>

      {result.overallSummary && (
        <p className="summary-text">{result.overallSummary}</p>
      )}

      <Separator />

      {result.chunks.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Chunks
          </h3>
          {result.chunks.map((chunk) => (
            <Card key={chunk.id}>
              <CardHeader className="pb-2">
                <CardTitle>{chunk.title}</CardTitle>
                {chunk.summary && (
                  <p className="text-xs text-muted-foreground">{chunk.summary}</p>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                {chunk.items.length > 0 ? (
                  <ul className="list-disc pl-5 text-sm space-y-1">
                    {chunk.items.map((it, i) => (
                      <li key={i}>{it}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-hint">No items.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </section>
      )}

      {result.keyEntities.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Key Entities
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {result.keyEntities.map((e, i) => (
              <Badge key={i} variant="secondary">{e}</Badge>
            ))}
          </div>
        </section>
      )}

      {result.relationships.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Workflow className="h-3.5 w-3.5" /> Relationships
          </h3>
          <ul className="text-sm space-y-1.5 list-disc pl-5">
            {result.relationships.map((r, i) => (
              <li key={i}>
                <span className="font-medium">{r.from}</span>
                <span className="text-muted-foreground"> → </span>
                <span className="font-medium">{r.to}</span>
                <span className="text-muted-foreground"> ({r.relationship})</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.uncertainties.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" /> Uncertainties
          </h3>
          <ul className="text-sm space-y-1 list-disc pl-5">
            {result.uncertainties.map((u, i) => (
              <li key={i} className="uncertainty-text">{u}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ClassifiedBadge({
  icon: Icon,
  label,
  confidence,
}: {
  icon: typeof FileText;
  label: string;
  confidence: number;
}) {
  const pct = Math.round(confidence * 100);
  return (
    <Badge variant="accent" title={`Confidence: ${pct}%`}>
      <Icon className="h-3 w-3 mr-1" />
      {label}
      <span className="ml-1 text-primary-foreground/70 font-normal">{pct}%</span>
    </Badge>
  );
}