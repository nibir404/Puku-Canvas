import { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';

export interface Visitor {
  id: string;
  name: string;
  initials: string;
  color: string;
  isSelf?: boolean;
}

export function UserAvatars() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [isLinkVisitor, setIsLinkVisitor] = useState(false);

  useEffect(() => {
    const isSharedLink = window.location.hash.includes('scene=');
    setIsLinkVisitor(isSharedLink);

    // Self avatar
    const self: Visitor = {
      id: 'self',
      name: isSharedLink ? 'You (Shared Link Visitor)' : 'You (Owner)',
      initials: isSharedLink ? 'LV' : 'YO',
      color: '#7c3aed',
      isSelf: true,
    };

    const list: Visitor[] = [self];

    // If coming via shared link, display owner avatar circle as well
    if (isSharedLink) {
      list.push({
        id: 'owner',
        name: 'Canvas Author',
        initials: 'CA',
        color: '#059669',
      });
    }

    setVisitors(list);
  }, []);

  return (
    <div className="user-presence-container">
      {isLinkVisitor && (
        <div className="link-visitor-pill" title="Viewing canvas via shared link">
          <span className="live-dot" />
          <span>Shared Link Active</span>
        </div>
      )}
      <div className="user-avatars-stack">
        {visitors.map((v) => (
          <div
            key={v.id}
            className={cn('avatar-circle', v.isSelf && 'avatar-self')}
            style={{ backgroundColor: v.color }}
            title={v.name}
          >
            {v.initials}
            <span className="avatar-status-dot" />
          </div>
        ))}
      </div>
    </div>
  );
}
